import type { Client } from "ssh2";
import { z } from "zod";

import type { AppAction } from "@/appActions.ts";
import type { IpadApp, IpadAppChange } from "@/bridge.ts";
import { readPlist } from "@/main/plist.ts";
import { quote, runScript } from "@/main/ssh.ts";
import {
  refreshHomeScreen,
  removedAppsFolder,
  stashAnywhere,
  stashManifest,
} from "@/main/system/stash.ts";

const applicationsFolder = "/Applications";
const snapshotsFolder = "/private/var/mobile/Library/Caches/Snapshots";
const daemonFolders = [
  "/System/Library/LaunchDaemons",
  "/Library/LaunchDaemons",
];
const volumes = ["/", "/private/var"];
const quietTimeoutMs = 5 * 60 * 1000;
const blockBytes = 512;
const reportedLines = 12;
const applePrefix = "com.apple.";
const ipadFamily = 2;
const changed = "app-changed";
const homeScreenFailure = "uicache-failed";
const linkRemoved = "link ";
const serviceMoved = "service ";
const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9.-]*$/;

const neverOnHomeScreen = new Set(["com.apple.webapp", "com.apple.webapp1"]);
const keptApps = new Set(["com.apple.Preferences"]);

const infoFile = "Info.plist";
const nameFiles = [
  "en.lproj/InfoPlist.strings",
  "English.lproj/InfoPlist.strings",
];

const plists = [applicationsFolder, removedAppsFolder]
  .flatMap((folder) =>
    [infoFile, ...nameFiles].map((file) => `${quote(folder)}/*.app/${file}`),
  )
  .join(" ");

const listing = `
find ${plists} -maxdepth 0 -type f -printf 'plist\\t%s\\t%p\\n' 2>/dev/null
printf 'contents\\t'
find ${plists} -maxdepth 0 -type f -print0 2>/dev/null | xargs -0 cat | openssl base64 -A
echo
find ${quote(applicationsFolder)} ${quote(removedAppsFolder)} -type f -printf 'file\\t%b\\t%p\\n' 2>/dev/null
dpkg-query -S ${quote(applicationsFolder)}/*.app/${infoFile} 2>/dev/null | sed 's/^/owner\\t/'
grep -a -o -H ${quote(`${applicationsFolder}/[^/]*\\.app/`)} ${daemonFolders.map((folder) => `${quote(folder)}/*.plist`).join(" ")} 2>/dev/null | sed 's/^/service\\t/'
`;

const infoSchema = z.object({
  CFBundleIdentifier: z.string().min(1),
  CFBundleDisplayName: z.string().optional(),
  CFBundleName: z.string().optional(),
  CFBundleShortVersionString: z.string().optional(),
  SBAppTags: z.array(z.string()).default([]),
  SBIconVisibilityDefaultVisible: z.boolean().optional(),
  SBIconVisibilitySetByAppPreference: z.boolean().optional(),
  UIDeviceFamily: z.array(z.unknown()).optional(),
});

const stringsSchema = z.object({
  CFBundleDisplayName: z.string().optional(),
});

type Info = z.infer<typeof infoSchema>;

interface LocatedApp extends IpadApp {
  path: string;
  servicePaths: string[];
}

function decode<Schema extends z.ZodType>(
  schema: Schema,
  file: Buffer | undefined,
): z.infer<Schema> | null {
  try {
    return file ? schema.parse(readPlist(file)) : null;
  } catch {
    return null;
  }
}

function onHomeScreen(info: Info): boolean {
  const shown = info.SBIconVisibilitySetByAppPreference
    ? info.SBIconVisibilityDefaultVisible === true
    : info.SBIconVisibilityDefaultVisible !== false;
  const forIpad =
    !info.UIDeviceFamily ||
    info.UIDeviceFamily.some((family) => Number(family) === ipadFamily);
  return (
    shown &&
    forIpad &&
    !info.SBAppTags.includes("hidden") &&
    !neverOnHomeScreen.has(info.CFBundleIdentifier)
  );
}

function appFolder(path: string): string {
  return /^.*?\.app(?=\/)/.exec(path)?.[0] ?? "";
}

function parseListing(output: string): LocatedApp[] {
  const sizes = new Map<string, number>();
  const owners = new Map<string, string>();
  const services = new Map<string, Set<string>>();
  const lengths: [path: string, bytes: number][] = [];
  let contents = Buffer.alloc(0);
  for (const line of output.split("\n")) {
    const [kind, first = "", second = ""] = line.split("\t");
    if (kind === "plist") {
      lengths.push([second, Number(first) || 0]);
    } else if (kind === "contents") {
      contents = Buffer.from(first, "base64");
    } else if (kind === "file") {
      const folder = appFolder(second);
      sizes.set(
        folder,
        (sizes.get(folder) ?? 0) + (Number(first) || 0) * blockBytes,
      );
    } else if (kind === "owner") {
      const [owner = "", path = ""] = first.split(": ");
      owners.set(appFolder(path), owner.split(", ")[0] ?? owner);
    } else if (kind === "service") {
      const separator = first.indexOf(":");
      const folder = appFolder(first.slice(separator + 1));
      services.set(
        folder,
        (services.get(folder) ?? new Set()).add(first.slice(0, separator)),
      );
    }
  }
  const files = new Map<string, Buffer>();
  let offset = 0;
  for (const [path, bytes] of lengths) {
    files.set(path, contents.subarray(offset, offset + bytes));
    offset += bytes;
  }
  const folders = [...files.keys()].flatMap((file) =>
    file.endsWith(`/${infoFile}`) ? [appFolder(file)] : [],
  );
  const apps = folders.flatMap((path) => {
    const info = decode(infoSchema, files.get(`${path}/${infoFile}`));
    const removed = path.startsWith(`${removedAppsFolder}/`);
    if (!info || !(removed || onHomeScreen(info))) {
      return [];
    }
    const names = nameFiles.flatMap(
      (file) => decode(stringsSchema, files.get(`${path}/${file}`)) ?? [],
    );
    const owner = owners.get(path) ?? null;
    const servicePaths = [...(services.get(path) ?? [])];
    const app: LocatedApp = {
      path,
      servicePaths,
      services: servicePaths.map((service) =>
        service.slice(service.lastIndexOf("/") + 1).replace(/\.plist$/, ""),
      ),
      id: info.CFBundleIdentifier,
      name:
        names.find((strings) => strings.CFBundleDisplayName)
          ?.CFBundleDisplayName ??
        info.CFBundleDisplayName ??
        info.CFBundleName ??
        path.slice(path.lastIndexOf("/") + 1).replace(/\.app$/, ""),
      version: info.CFBundleShortVersionString ?? null,
      kind:
        owner !== null
          ? "package"
          : info.CFBundleIdentifier.startsWith(applePrefix)
            ? "stock"
            : "other",
      package: owner,
      removed,
      removable: !keptApps.has(info.CFBundleIdentifier),
      bytes: sizes.get(path) ?? 0,
    };
    return [app];
  });
  const installed = new Set(
    apps.filter(({ removed }) => !removed).map(({ id }) => id),
  );
  return apps
    .filter(({ id, removed }) => !removed || !installed.has(id))
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

async function locateApps(client: Client): Promise<LocatedApp[]> {
  return parseListing(await runScript(client, listing, quietTimeoutMs));
}

export async function readApps(client: Client): Promise<IpadApp[]> {
  return (await locateApps(client)).map(
    ({ path: _path, servicePaths: _servicePaths, ...app }) => app,
  );
}

function allowed({ kind, removed, removable }: LocatedApp): AppAction | null {
  if (removed) {
    return "restore";
  }
  if (kind === "package") {
    return "uninstall";
  }
  return removable ? "remove" : null;
}

function escapeGlob(text: string): string {
  return text.replace(/[\\*?[\]]/g, String.raw`\$&`);
}

function linkSearch(target: string): string {
  const glob = escapeGlob(target);
  const links = String.raw`-type l \( -lname ${quote(glob)} -o -lname ${quote(`${glob}/*`)} \) -print`;
  return volumes
    .map(
      (volume, index) =>
        `find ${volume} -xdev -path ${quote(stashAnywhere)} -prune -o ${links} > "$L.${String(index)}" 2>/dev/null </dev/null &`,
    )
    .join("\n");
}

function changeScript(
  { id, path, package: owner, servicePaths }: LocatedApp,
  action: AppAction,
): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const installed = `${applicationsFolder}/${name}`;
  const references = `${removedAppsFolder}/${name.replace(/\.app$/, "")}.references`;
  const line = `${installed} moved to ${removedAppsFolder}`;
  const lists = volumes.map((_volume, index) => `"$L.${String(index)}"`);
  const finish = [
    ...(identifierPattern.test(id)
      ? [`rm -rf ${quote(`${snapshotsFolder}/${id}`)}`]
      : []),
    `${refreshHomeScreen} </dev/null >/dev/null 2>&1 || echo ${homeScreenFailure}`,
  ].join("\n  ");
  const setUp = `
M=${quote(stashManifest)}
R=${quote(removedAppsFolder)}
E=${quote(references)}
L="$R/.links"
mkdir -p "$R"`;
  const tidy = `wait
rm -f ${lists.join(" ")}`;
  if (action === "restore") {
    return `${setUp}
if { { [ ! -e ${quote(installed)} ] || { echo ${quote(`${installed} is already there`)}; false; }; } && mv ${quote(path)} ${quote(`${applicationsFolder}/`)} && { grep -v -x -F ${quote(line)} "$M" > "$M.new"; mv "$M.new" "$M"; }; } 2>&1; then
  echo ${changed}
  if [ -d "$E" ]; then
    find "$E" -type f -name '*.plist' | while IFS= read -r p; do
      o="\${p#"$E"}"
      if [ ! -e "$o" ] && cp -a "$p" "$o"; then
        launchctl load "$o" >/dev/null 2>&1
        echo "${serviceMoved}$o"
      fi
    done
    if [ -f "$E/links.tsv" ]; then
      while IFS=$'\\t' read -r l t; do
        if [ ! -e "$l" ] && [ ! -L "$l" ] && ln -s "$t" "$l"; then echo "${linkRemoved}$l"; fi
      done < "$E/links.tsv"
    fi
    rm -rf "$E"
  fi
  ${finish}
fi
`;
  }
  const change =
    action === "remove"
      ? `rm -rf ${quote(`${removedAppsFolder}/${name}`)} && mv ${quote(path)} "$R/" && echo ${quote(line)} >> "$M"`
      : `dpkg -r ${quote(owner ?? "")} </dev/null`;
  const setAside =
    action === "remove" && servicePaths.length > 0
      ? `for p in ${servicePaths.map(quote).join(" ")}; do
    [ -f "$p" ] || continue
    launchctl unload "$p" >/dev/null 2>&1
    mkdir -p "$E" && cp -a --parents "$p" "$E" && rm -f "$p" && echo "${serviceMoved}$p"
  done`
      : "";
  const record =
    action === "remove"
      ? String.raw`t=$(readlink "$l") || continue
    mkdir -p "$E" && printf '%s\t%s\n' "$l" "$t" >> "$E/links.tsv" && rm -f "$l" && echo "${linkRemoved}$l"`
      : `if [ -L "$l" ] && rm -f "$l"; then echo "${linkRemoved}$l"; fi`;
  return `${setUp}
${linkSearch(installed)}
if { ${change}; } 2>&1; then
  echo ${changed}
  ${setAside}
  wait
  cat ${lists.join(" ")} 2>/dev/null | while IFS= read -r l; do
    ${record}
  done
  ${finish}
fi
${tidy}
`;
}

export async function changeApp(
  client: Client,
  id: string,
  action: AppAction,
): Promise<IpadAppChange> {
  const app = (await locateApps(client)).find(
    (candidate) => candidate.id === id,
  );
  if (!app || allowed(app) !== action) {
    return { state: "missing" };
  }
  const lines = (
    await runScript(client, changeScript(app, action), quietTimeoutMs)
  ).split("\n");
  if (!lines.includes(changed)) {
    return {
      state: "refused",
      output: lines
        .filter((line) => line.trim())
        .slice(-reportedLines)
        .join("\n"),
    };
  }
  return {
    state: "changed",
    homeScreenRefreshed: !lines.includes(homeScreenFailure),
    links: lines.filter((line) => line.startsWith(linkRemoved)).length,
    services: lines.filter((line) => line.startsWith(serviceMoved)).length,
  };
}
