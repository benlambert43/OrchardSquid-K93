import type { Client } from "ssh2";
import { z } from "zod";

import type { CleanUpProgress, IpadCleanUp } from "@/bridge.ts";
import {
  type CleanUpOption,
  type CleanUpStep,
  cleanUpOptions,
  cleanUpSteps,
} from "@/cleanUpSteps.ts";
import { readPlist } from "@/main/plist.ts";
import { quote, runEach, runScript } from "@/main/ssh.ts";
import { stashFolder, stashManifest } from "@/main/system/stash.ts";

const quietTimeoutMs = 10 * 60 * 1000;
const heartbeatMs = 1000;
const kilobyte = 1024;
const bytesPerUnit = 64 * kilobyte;
const batchSize = 100;

const linkedFolders = [
  "/usr/share/vim",
  "/usr/libexec/git-core",
  "/usr/lib/p7zip",
  "/usr/include",
  "/Library/Wallpaper",
  "/Library/Ringtones",
];

const updateRamdisk = "/usr/standalone/update/ramdisk";

const voiceTrigger = [
  "/System/Library/PreinstalledAssets/com_apple_MobileAsset_VoiceTriggerAssets.cpio",
  "/System/Library/PreinstalledAssets/com_apple_MobileAsset_VoiceTriggerAssets.xml",
];

const mapFolder = "/System/Library/PrivateFrameworks/GeoServices.framework";
const mapFiles = ["*.iconpack", "*.shieldpack", "*.shieldindex"];

const languagePreferences =
  "/var/mobile/Library/Preferences/.GlobalPreferences.plist";

interface LanguageFolder {
  step: CleanUpStep;
  folder: string;
  languages?: Partial<Record<string, string>>;
}

const languageFolders: LanguageFolder[] = [
  { step: "languages", folder: "/System/Library/LinguisticData" },
  {
    step: "languages",
    folder:
      "/System/Library/PrivateFrameworks/VoiceServices.framework/TTSResources",
  },
  { step: "languages", folder: "/usr/share/mecabra" },
  {
    step: "fonts",
    folder: "/System/Library/Fonts/LanguageSupport",
    languages: {
      "PingFang.ttc": "zh",
      "HeitiFallback-Light.ttf": "zh",
      "HeitiFallback-Medium.ttf": "zh",
      "Thonburi.ttc": "th",
    },
  },
  { step: "systemData", folder: "/usr/share/tokenizer" },
  {
    step: "systemData",
    folder: "/System/Library/PrivateFrameworks/CoreHandwriting.framework",
    languages: {
      "model_zh.bin": "zh",
      "synthetics_zh-hans.txt": "zh",
      "synthetics_zh-hant.txt": "zh",
    },
  },
];

const fallbackLanguage = "en";
const sameLanguage: Partial<Record<string, string>> = { nb: "no", nn: "no" };
const formerNames: Partial<Record<string, string>> = {
  en: "English",
  fr: "French",
  de: "German",
  ja: "Japanese",
  es: "Spanish",
  it: "Italian",
  nl: "Dutch",
  sv: "Swedish",
  pt: "Portuguese",
  da: "Danish",
  ru: "Russian",
};
const unreadLanguages =
  "language data, because the iPad's language settings could not be read";

const preferencesSchema = z.object({
  AppleLanguages: z.array(z.string()).min(1),
  AppleKeyboards: z.array(z.string()).default([]),
  ApplePasscodeKeyboards: z.array(z.string()).default([]),
  AppleLocale: z.string().default(""),
});

interface Item {
  step: CleanUpStep;
  path: string;
}

interface Bulk {
  id: string;
  step: CleanUpStep;
  label: string;
  things: string;
  unit: number;
  search: string;
}

interface Plan {
  items: Item[];
  bulks: Bulk[];
  languagesRead: boolean;
}

type Announce = (progress: Omit<CleanUpProgress, "seconds">) => void;

function languageOf(tag: string): string | null {
  const language = /^[a-z]{2,3}(?=$|[-_@])/i.exec(tag)?.[0].toLowerCase();
  return language === undefined ? null : (sameLanguage[language] ?? language);
}

function readUsedLanguages(encoded: string): Set<string> | null {
  try {
    const preferences = preferencesSchema.parse(
      readPlist(Buffer.from(encoded, "base64")),
    );
    const tags = [
      ...preferences.AppleLanguages,
      ...preferences.AppleKeyboards,
      ...preferences.ApplePasscodeKeyboards,
      preferences.AppleLocale,
    ];
    return new Set([
      fallbackLanguage,
      ...tags.flatMap((tag) => languageOf(tag) ?? []),
    ]);
  } catch (error) {
    console.error("The iPad's language settings could not be read", error);
    return null;
  }
}

function unusedEntries(
  { step, folder, languages }: LanguageFolder,
  listing: string,
  used: Set<string>,
): Item[] {
  return listing
    .split("\n")
    .filter((name) => {
      const language = languages
        ? (languages[name] ?? null)
        : languageOf(
            name.replace(/^RequiredAssets_/, "").replace(/\.bundle$/, ""),
          );
      return language !== null && !used.has(language);
    })
    .map((name) => ({ step, path: `${folder}/${name}` }));
}

function translationSearch(used: Set<string>): string {
  const kept = [...used].flatMap((language) => {
    const codes = [
      language,
      ...Object.keys(sameLanguage).filter(
        (code) => sameLanguage[code] === language,
      ),
    ];
    const formerName = formerNames[language];
    return [
      ...codes.flatMap((code) => [code, `${code}[-_][A-Za-z0-9]+`]),
      ...(formerName ? [formerName] : []),
    ];
  });
  const pattern = String.raw`/(Base|${kept.join("|")})\.lproj$`;
  return `find / -xdev -type d -name '*.lproj' -prune -print 2>/dev/null | grep -v -E ${quote(pattern)}`;
}

function mapSearch(): string {
  const names = mapFiles.map((name) => `-name ${quote(name)}`).join(" -o ");
  return String.raw`find ${quote(mapFolder)} -maxdepth 1 -type f \( ${names} \) 2>/dev/null`;
}

async function makePlan(
  client: Client,
  options: Set<CleanUpOption>,
): Promise<Plan> {
  const chosen = (step: CleanUpStep) =>
    cleanUpOptions.every((option) => option !== step || options.has(option));
  const folders = languageFolders.filter(({ step }) => chosen(step));
  const commands: Record<string, string> = {
    [languagePreferences]: `openssl base64 -A < ${quote(languagePreferences)}`,
  };
  for (const { folder } of folders) {
    commands[folder] = `ls -1 ${quote(folder)}`;
  }
  const outputs: Partial<Record<string, string>> = await runEach(
    client,
    commands,
  );
  const used = readUsedLanguages(outputs[languagePreferences] ?? "");
  const languageData = used
    ? folders.flatMap((entry) =>
        unusedEntries(entry, outputs[entry.folder] ?? "", used),
      )
    : [];
  const items: Item[] = [
    ...linkedFolders.map((path) => ({ step: "folders" as const, path })),
    ...languageData,
    { step: "update", path: updateRamdisk },
    ...(options.has("systemData")
      ? voiceTrigger.map((path) => ({ step: "systemData" as const, path }))
      : []),
  ];
  const bulks: Bulk[] = [
    ...(options.has("systemData")
      ? [
          {
            id: "maps",
            step: "systemData" as const,
            label: "map icons and road shields",
            things: "map files",
            unit: 2,
            search: mapSearch(),
          },
        ]
      : []),
    ...(options.has("translations") && used
      ? [
          {
            id: "translations",
            step: "translations" as const,
            label: "interface translations",
            things: "translation folders",
            unit: 3,
            search: translationSearch(used),
          },
        ]
      : []),
  ];
  return { items, bulks, languagesRead: used !== null };
}

async function weigh(
  client: Client,
  items: Item[],
): Promise<Map<string, number>> {
  const weights = new Map(items.map(({ path }) => [path, 0]));
  const listing = await runScript(
    client,
    String.raw`find ${items.map(({ path }) => quote(path)).join(" ")} -printf '%s\t%p\n' 2>/dev/null`,
    quietTimeoutMs,
  );
  for (const line of listing.split("\n")) {
    const [size = "", entry = ""] = line.split("\t");
    const bytes = Number(size);
    let owner = entry;
    while (owner && !weights.has(owner)) {
      owner = owner.slice(0, owner.lastIndexOf("/"));
    }
    if (owner && Number.isFinite(bytes)) {
      weights.set(owner, (weights.get(owner) ?? 0) + 1 + bytes / bytesPerUnit);
    }
  }
  return weights;
}

const stepOrder: CleanUpStep[] = [
  "folders",
  "languages",
  "update",
  "fonts",
  "systemData",
  "translations",
];

function buildScript({ items, bulks }: Plan): string {
  const searches = bulks.map(
    ({ id, search }) =>
      `${search} > "$B/${id}.list"\necho "count ${id} $(grep -c '' "$B/${id}.list")"`,
  );
  const steps = stepOrder.flatMap((step) => {
    const paths = items.filter((item) => item.step === step);
    const moves = bulks.filter((bulk) => bulk.step === step);
    if (paths.length === 0 && moves.length === 0) {
      return [];
    }
    return [
      `echo "step ${step}"`,
      ...(paths.length > 0
        ? [
            `for s in ${paths.map(({ path }) => quote(path)).join(" ")}; do ${step === "folders" ? "link_folder" : "stash"} "$s"; done`,
          ]
        : []),
      ...moves.map(
        ({ id, label }) =>
          `bulk ${id} ${quote(`${label} moved to ${stashFolder}, each under its own path`)}`,
      ),
    ];
  });
  return `
B=${quote(stashFolder)}
M=${quote(stashManifest)}
mkdir -p "$B" || { echo "failed $B"; exit 0; }
printf 'free-before '; df -k / | sed -n 2p

link_folder() {
  s="$1"
  d="$B$s"
  old="$s.orchardsquid-old"
  echo "item $s"
  if [ -L "$s" ]; then rm -rf "$old"; echo "done $s"; return; fi
  if [ ! -d "$s" ]; then echo "done $s"; return; fi
  rm -rf "$d"
  if mkdir -p "$(dirname "$d")" && cp -a "$s" "$d" &&
    [ "$(find "$s" | grep -c '')" = "$(find "$d" | grep -c '')" ] &&
    mv "$s" "$old" && ln -s "$d" "$s"; then
    rm -rf "$old"
    echo "$s linked to $d" >> "$M"
    echo "moved $s"
  else
    if [ ! -e "$s" ] && [ -d "$old" ]; then mv "$old" "$s"; fi
    echo "failed $s"
  fi
}

note() {
  grep -q -x -F "$1" "$M" 2>/dev/null || echo "$1" >> "$M"
}

stash() {
  s="$1"
  d="$B$s"
  echo "item $s"
  if [ ! -e "$s" ] && [ ! -L "$s" ]; then echo "done $s"; return; fi
  if cp -a --parents "$s" "$B" &&
    [ "$(find "$s" | grep -c '')" -le "$(find "$d" | grep -c '')" ] &&
    rm -rf "$s"; then
    note "$s moved to $d"
    echo "moved $s"
  else
    echo "failed $s"
  fi
}

flush() {
  n=$((\${#batch[@]} + skipped))
  if [ "\${#batch[@]}" -gt 0 ]; then
    if cp -a --parents "\${batch[@]}" "$B" &&
      [ "$(find "\${batch[@]}" | grep -c '')" -le "$(find "\${batch[@]/#/$B}" | grep -c '')" ] &&
      rm -rf "\${batch[@]}"; then
      note "$2"
      echo "batch $1 $n"
    else
      echo "failed-batch $1 $n"
    fi
  elif [ "$n" -gt 0 ]; then
    echo "batch $1 $n"
  fi
  batch=()
  skipped=0
}

bulk() {
  batch=()
  skipped=0
  while IFS= read -r p; do
    if [ -e "$p" ]; then batch+=("$p"); else skipped=$((skipped + 1)); fi
    if [ "$((\${#batch[@]} + skipped))" -ge ${String(batchSize)} ]; then flush "$1" "$2"; fi
  done < "$B/$1.list"
  flush "$1" "$2"
  rm -f "$B/$1.list"
}

echo "step search"
${searches.join("\n")}
${steps.join("\n")}

printf 'free-after '; df -k / | sed -n 2p
`;
}

function follow(
  weights: Map<string, number>,
  bulks: Bulk[],
  announce: Announce,
): (line: string) => void {
  const numbers = new Intl.NumberFormat();
  const tallies = new Map(bulks.map(({ id }) => [id, { all: 0, handled: 0 }]));
  let total = [...weights.values()].reduce((sum, weight) => sum + weight, 0);
  let finished = 0;
  let step: CleanUpStep = "search";
  let item: string | null = null;
  return (line) => {
    const [word = "", ...rest] = line.split(" ");
    const value = rest.join(" ");
    if (word === "step") {
      const next = cleanUpSteps.find((known) => known === value);
      if (!next) {
        return;
      }
      step = next;
      item = null;
    } else if (word === "item") {
      item = value;
    } else if (word === "moved" || word === "done" || word === "failed") {
      finished += weights.get(value) ?? 0;
    } else {
      const bulk = bulks.find(({ id }) => id === rest[0]);
      const tally = tallies.get(rest[0] ?? "");
      const amount = Number(rest[1]);
      if (!bulk || !tally || !Number.isSafeInteger(amount)) {
        return;
      }
      if (word === "count") {
        tally.all = amount;
        total += amount * bulk.unit;
      } else if (word === "batch" || word === "failed-batch") {
        tally.handled += amount;
        finished += amount * bulk.unit;
        item = `${numbers.format(tally.handled)} of ${numbers.format(tally.all)} ${bulk.things}`;
      } else {
        return;
      }
    }
    announce({
      step,
      item,
      fraction: total > 0 ? Math.min(finished / total, 1) : 0,
    });
  };
}

function freeBytes(output: string, label: string): number | null {
  const available = new RegExp(
    String.raw`^${label} \S+\s+\d+\s+\d+\s+(\d+)\s`,
    "m",
  ).exec(output)?.[1];
  return available === undefined ? null : Number(available) * kilobyte;
}

function paths(output: string, outcome: string): string[] {
  return [...output.matchAll(new RegExp(`^${outcome} (.+)$`, "gm"))].flatMap(
    ([, path]) => (path ? [path] : []),
  );
}

function bulkLabels(output: string, outcome: string, bulks: Bulk[]): string[] {
  return bulks
    .filter(({ id }) =>
      paths(output, outcome).some(
        (batch) => batch.startsWith(`${id} `) && !batch.endsWith(" 0"),
      ),
    )
    .map(({ label }) => label);
}

export async function cleanUp(
  client: Client,
  options: CleanUpOption[],
  report: (progress: CleanUpProgress) => void,
): Promise<IpadCleanUp> {
  const started = Date.now();
  let latest: Omit<CleanUpProgress, "seconds"> = {
    step: "survey",
    item: null,
    fraction: 0,
  };
  const announce: Announce = (progress) => {
    latest = progress;
    report({
      ...progress,
      seconds: Math.round((Date.now() - started) / 1000),
    });
  };
  const heartbeat = setInterval(() => {
    announce(latest);
  }, heartbeatMs);
  try {
    announce(latest);
    const plan = await makePlan(client, new Set(options));
    const weights = await weigh(client, plan.items);
    const output = await runScript(
      client,
      buildScript(plan),
      quietTimeoutMs,
      follow(weights, plan.bulks, announce),
    );
    return {
      moved: [
        ...paths(output, "moved"),
        ...bulkLabels(output, "batch", plan.bulks),
      ],
      alreadyDone: paths(output, "done").length,
      failed: [
        ...paths(output, "failed"),
        ...bulkLabels(output, "failed-batch", plan.bulks),
        ...(plan.languagesRead ? [] : [unreadLanguages]),
      ],
      freeBeforeBytes: freeBytes(output, "free-before"),
      freeAfterBytes: freeBytes(output, "free-after"),
    };
  } finally {
    clearInterval(heartbeat);
  }
}
