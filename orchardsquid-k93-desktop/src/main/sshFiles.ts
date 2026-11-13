import { readFile } from "node:fs/promises";
import path from "node:path";

import SSHConfig, { type Directive, type Line, type Section } from "ssh-config";
import { utils } from "ssh2";

import type { ConfigHost } from "@/main/backupFormat.ts";
import { keyPath } from "@/main/ssh.ts";

export const sshDirectory = path.dirname(keyPath);
export const publicKeyPath = `${keyPath}.pub`;
export const knownHostsPath = path.join(sshDirectory, "known_hosts");
export const configPath = path.join(sshDirectory, "config");

export function readText(file: string): Promise<string | null> {
  return readFile(file, "utf8").catch(() => null);
}

export function derivePublicKey(
  privateKey: string,
  comment?: string,
): string | null {
  const parsed = utils.parseKey(privateKey);
  if (parsed instanceof Error) {
    return null;
  }
  const blob = parsed.getPublicSSH().toString("base64");
  return `${parsed.type} ${blob} ${comment ?? parsed.comment}\n`;
}

function isHostSection(line: Line): line is Section {
  return (
    line.type === SSHConfig.DIRECTIVE &&
    "config" in line &&
    line.param.toLowerCase() === "host"
  );
}

function readValue(value: Directive["value"]): string {
  return typeof value === "string"
    ? value
    : value.map(({ val }) => val).join(" ");
}

export function listConfigHosts(config: string): ConfigHost[] {
  return Array.from(SSHConfig.parse(config))
    .filter(isHostSection)
    .map((section) => ({
      host: readValue(section.value),
      options: Array.from(section.config).flatMap((line) =>
        line.type === SSHConfig.DIRECTIVE
          ? [{ name: line.param, value: readValue(line.value) }]
          : [],
      ),
    }));
}
