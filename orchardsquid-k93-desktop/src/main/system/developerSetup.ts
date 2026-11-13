import type { Client } from "ssh2";

import type { IpadDeveloperSetup, IpadOffer } from "@/bridge.ts";
import { compilerFolder, developerPackageIds } from "@/developerSetup.ts";
import { runEach } from "@/main/ssh.ts";

const factoryPasswordHash = "/smx7MYTQIi2M";
const catalogueFolder = "/var/mobile/Library/Caches/com.saurik.Cydia/lists";
const profileManifest =
  "/private/var/containers/Shared/SystemGroup/systemgroup.com.apple.configurationprofiles/Library/ConfigurationProfiles/PayloadManifest.plist";
const rootCertificateProfile = "ca.litten.rootca";
const contextLines = 25;
const kilobyte = 1024;

const packagePattern = developerPackageIds
  .map((id) => id.replaceAll(".", String.raw`\.`))
  .join("|");

const commands = {
  sources: "cat /etc/apt/sources.list.d/*.list",
  defaultPasswordAccounts: `grep -E '^(root|mobile):${factoryPasswordHash}:' /etc/master.passwd | sed 's/:.*//'`,
  aptGet: "ls /usr/bin/apt-get",
  systemFree: "df -k /",
  compilerFolderLink: `find ${compilerFolder.path} -maxdepth 0 -printf '%l'`,
  rootCertificates: `grep -l ${rootCertificateProfile} ${profileManifest}`,
  offers: `(cd ${catalogueFolder} && grep -A ${String(contextLines)} -x -E 'Package: (${packagePattern})' *_Packages)`,
};

function lines(output: string): string[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function withoutScheme(url: string): string {
  return url.replace(/^\w+:\/\//, "").replace(/\/+$/, "");
}

function parseSourceUrls(output: string): string[] {
  return lines(output).flatMap((line) => {
    const [kind, url] = line.split(/\s+/);
    return kind === "deb" && url ? [url] : [];
  });
}

function newer(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { numeric: true }) > 0;
}

function catalogueBaseUrl(file: string, sourceUrls: string[]): string | null {
  const url = sourceUrls.find((candidate) =>
    file.startsWith(`${withoutScheme(candidate).replaceAll("/", "_")}_`),
  );
  return url ? `${url.replace(/\/+$/, "")}/` : null;
}

interface Listing {
  id: string;
  file: string;
  fields: Map<string, string>;
}

function toOffer(
  { file, fields }: Listing,
  sourceUrls: string[],
): IpadOffer | null {
  const version = fields.get("Version");
  if (!version) {
    return null;
  }
  const base = catalogueBaseUrl(file, sourceUrls);
  const filename = fields.get("Filename");
  return {
    source: file.split("_")[0] ?? file,
    version,
    url: base && filename ? `${base}${filename.replace(/^\.\//, "")}` : null,
    md5: fields.get("MD5sum") ?? null,
    installedBytes: kilobytes(fields.get("Installed-Size")),
  };
}

function kilobytes(value: string | undefined): number | null {
  const count = Number(value);
  return value && Number.isFinite(count) ? count * kilobyte : null;
}

function parseSystemFree(output: string): number | null {
  const available = /^\S+\s+\d+\s+\d+\s+(\d+)\s+\d+%\s+\/$/m.exec(output)?.[1];
  return kilobytes(available);
}

function parseListings(output: string): Listing[] {
  const listings: Listing[] = [];
  let current: Listing | null = null;
  for (const line of output.split("\n")) {
    const match = /^(.+?_Packages)[:-](.*)$/.exec(line);
    const [, file = "", field = ""] = match ?? [];
    const packageId = /^Package: (.+)$/.exec(field)?.[1];
    if (!match || !field.trim()) {
      current = null;
    } else if (packageId && line.startsWith(`${file}:`)) {
      current = { id: packageId, file, fields: new Map() };
      listings.push(current);
    } else if (current) {
      const [, name, value] = /^([\w-]+): (.*)$/.exec(field) ?? [];
      if (name && value !== undefined && !current.fields.has(name)) {
        current.fields.set(name, value.trim());
      }
    }
  }
  return listings;
}

function parseOffers(
  output: string,
  sourceUrls: string[],
): IpadDeveloperSetup["offers"] {
  const offers: Record<string, Map<string, IpadOffer>> = {};
  for (const listing of parseListings(output)) {
    const offer = toOffer(listing, sourceUrls);
    if (offer) {
      const sources = (offers[listing.id] ??= new Map());
      const known = sources.get(offer.source);
      if (!known || newer(offer.version, known.version)) {
        sources.set(offer.source, offer);
      }
    }
  }
  return Object.fromEntries(
    Object.entries(offers).map(([id, sources]) => [id, [...sources.values()]]),
  );
}

export async function readDeveloperSetup(
  client: Client,
): Promise<IpadDeveloperSetup> {
  const outputs = await runEach(client, commands);
  const sourceUrls = parseSourceUrls(outputs.sources);
  return {
    sources: sourceUrls.map(withoutScheme),
    defaultPasswordAccounts: lines(outputs.defaultPasswordAccounts),
    aptGet: outputs.aptGet.trim() !== "",
    rootCertificates: outputs.rootCertificates.trim() !== "",
    systemFreeBytes: parseSystemFree(outputs.systemFree),
    compilerFolderLink: outputs.compilerFolderLink.trim() || null,
    offers: parseOffers(outputs.offers, sourceUrls),
  };
}
