import type { Client } from "ssh2";

import { quote, runScript, upload } from "@/main/ssh.ts";
import { refreshHomeScreen } from "@/main/system/stash.ts";

const copyTimeoutMs = 10 * 60 * 1000;
const installTimeoutMs = 5 * 60 * 1000;
const reportedLines = 12;
const packageLabel = "deb-package";
const versionLabel = "deb-version";
const stepLabel = "deb-step";
const statusLabel = "dpkg-status";
const homeScreenFailure = "uicache-failed";
const labels = [packageLabel, versionLabel, stepLabel, statusLabel];

export type DebStep = "copy" | "dpkg" | "homeScreen";

export type DebInstall =
  | {
      state: "installed";
      package: string | null;
      version: string | null;
      homeScreenRefreshed: boolean;
    }
  | { state: "refused"; output: string };

function buildScript(file: string): string {
  return `
f=${quote(file)}
echo "${packageLabel} $(dpkg-deb -f "$f" Package </dev/null 2>/dev/null)"
echo "${versionLabel} $(dpkg-deb -f "$f" Version </dev/null 2>/dev/null)"
echo "${stepLabel} dpkg"
dpkg -i "$f" </dev/null 2>&1
status=$?
rm -f "$f"
if [ "$status" = 0 ]; then
  echo "${stepLabel} homeScreen"
  ${refreshHomeScreen} </dev/null >/dev/null 2>&1 || echo ${homeScreenFailure}
fi
echo "${statusLabel} $status"
`;
}

function describeFailure(lines: string[]): string {
  return lines
    .filter(
      (line) =>
        line.trim() &&
        line !== homeScreenFailure &&
        !labels.some((label) => line.startsWith(`${label} `)),
    )
    .slice(-reportedLines)
    .join("\n");
}

export async function installDeb(
  client: Client,
  contents: Buffer,
  file: string,
  report?: (step: DebStep, fraction: number | null) => void,
): Promise<DebInstall> {
  report?.("copy", 0);
  await upload(client, file, contents, copyTimeoutMs, (fraction) => {
    report?.("copy", fraction);
  });
  const output = await runScript(
    client,
    buildScript(file),
    installTimeoutMs,
    (line) => {
      const step = line.startsWith(`${stepLabel} `)
        ? line.slice(stepLabel.length + 1)
        : null;
      if (step === "dpkg" || step === "homeScreen") {
        report?.(step, null);
      }
    },
  );
  const lines = output.split("\n");
  if (!lines.includes(`${statusLabel} 0`)) {
    return { state: "refused", output: describeFailure(lines) };
  }
  const read = (label: string) =>
    (
      lines.find((line) => line.startsWith(`${label} `))?.slice(label.length) ??
      ""
    ).trim() || null;
  return {
    state: "installed",
    package: read(packageLabel),
    version: read(versionLabel),
    homeScreenRefreshed: !lines.includes(homeScreenFailure),
  };
}
