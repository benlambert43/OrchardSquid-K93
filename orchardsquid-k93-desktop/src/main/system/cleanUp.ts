import type { Client } from "ssh2";

import type { IpadCleanUp } from "@/bridge.ts";
import { runScript } from "@/main/ssh.ts";

const stashFolder = "/private/var/stash/OrchardSquid";
const scriptTimeoutMs = 10 * 60 * 1000;
const kilobyte = 1024;

const removedApps = [
  "iBooks",
  "Maps",
  "Podcasts",
  "News",
  "FindMyFriends",
  "FindMyiPhone",
  "MobileMail",
  "Feedback Assistant iOS",
  "AppStore",
  "FaceTime",
  "Tips",
  "iCloudDriveApp",
  "MobileStore",
  "Game Center",
];

const linkedFolders = [
  "/usr/share/vim",
  "/usr/libexec/git-core",
  "/usr/lib/p7zip",
  "/usr/include",
  "/Library/Wallpaper",
  "/Library/Ringtones",
];

function quote(value: string): string {
  return `'${value.replaceAll("'", String.raw`'\''`)}'`;
}

const script = String.raw`
B=${quote(stashFolder)}
M="$B/manifest.txt"
mkdir -p "$B/RemovedApps" || { echo "failed $B"; exit 0; }
printf 'free-before '; df -k / | sed -n 2p

apps_moved=0
for a in ${removedApps.map(quote).join(" ")}; do
  s="/Applications/$a.app"
  d="$B/RemovedApps/$a.app"
  if [ ! -e "$s" ]; then echo "done $s"; continue; fi
  rm -rf "$d"
  if mv "$s" "$B/RemovedApps/"; then
    echo "$s moved to $B/RemovedApps" >> "$M"
    echo "moved $s"
    apps_moved=1
  else
    echo "failed $s"
  fi
done

for s in ${linkedFolders.map(quote).join(" ")}; do
  d="$B$s"
  old="$s.orchardsquid-old"
  if [ -L "$s" ]; then rm -rf "$old"; echo "done $s"; continue; fi
  if [ ! -d "$s" ]; then echo "done $s"; continue; fi
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
done

if [ "$apps_moved" = 1 ]; then
  (cd / && su mobile -c uicache) >/dev/null 2>&1 || echo "failed uicache"
fi
printf 'free-after '; df -k / | sed -n 2p
`;

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

export async function cleanUp(client: Client): Promise<IpadCleanUp> {
  const output = await runScript(client, script, scriptTimeoutMs);
  return {
    moved: paths(output, "moved"),
    alreadyDone: paths(output, "done").length,
    failed: paths(output, "failed"),
    freeBeforeBytes: freeBytes(output, "free-before"),
    freeAfterBytes: freeBytes(output, "free-after"),
  };
}
