import type { Client } from "ssh2";

import type { IpadPackageTool, IpadSshServer } from "@/bridge.ts";
import { runEach } from "@/main/ssh.ts";

const packageFormat = ["Package", "Version", "Status"]
  .map((field) => `\${${field}}`)
  .join("\\t");
const installedStatus = "install ok installed";

const commands = {
  packages: `dpkg-query -W -f '${packageFormat}\\n' openssh dpkg 2>/dev/null`,
  architecture: "dpkg --print-architecture 2>/dev/null",
  server: "/usr/sbin/sshd -T 2>/dev/null",
  keys: "grep -c -E '^[^#[:space:]]' ~/.ssh/authorized_keys 2>/dev/null",
};

export interface DevelopmentReading {
  openssh: IpadSshServer;
  dpkg: IpadPackageTool;
}

function readVersions(output: string): Map<string, string> {
  return new Map(
    output.split("\n").flatMap((line) => {
      const [id = "", version = "", status = ""] = line.split("\t");
      return id && version && status === installedStatus
        ? [[id, version] as const]
        : [];
    }),
  );
}

function readSettings(output: string): Map<string, string> {
  const settings = new Map<string, string>();
  for (const line of output.split("\n")) {
    const [, name, value] = /^(\S+)\s+(.+)$/.exec(line.trim()) ?? [];
    if (name && value !== undefined && !settings.has(name)) {
      settings.set(name, value);
    }
  }
  return settings;
}

export async function readDevelopment(
  client: Client,
): Promise<DevelopmentReading> {
  const outputs = await runEach(client, commands);
  const versions = readVersions(outputs.packages);
  const settings = readSettings(outputs.server);
  const port = Number(settings.get("port"));
  const passwords = settings.get("passwordauthentication");
  const keys = Number.parseInt(outputs.keys, 10);
  return {
    openssh: {
      version: versions.get("openssh") ?? null,
      port: Number.isInteger(port) && port > 0 ? port : null,
      passwordSignIn: passwords === undefined ? null : passwords === "yes",
      authorizedKeys: Number.isNaN(keys) ? 0 : keys,
    },
    dpkg: {
      version: versions.get("dpkg") ?? null,
      architecture: outputs.architecture.trim() || null,
    },
  };
}
