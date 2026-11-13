import { appendFile, mkdir, rename, writeFile } from "node:fs/promises";
import os from "node:os";

import { strFromU8, unzipSync } from "fflate";
import { utils } from "ssh2";

import {
  type BackupFiles,
  backupSchema,
  type ConfigHost,
} from "@/main/backupFormat.ts";
import { keyPath } from "@/main/ssh.ts";
import {
  configPath,
  derivePublicKey,
  knownHostsPath,
  listConfigHosts,
  publicKeyPath,
  readText,
  sshDirectory,
} from "@/main/sshFiles.ts";

const maxFileBytes = 256 * 1024;
const ownerOnly = 0o600;
const ownerOnlyDirectory = 0o700;
const readableByAll = 0o644;
const literalHostName = /^[\w.:-]+$/;
const publicKeyLine = /^\S+ \S+(?: [^\n]*)?\n?$/;
const restorableOptions = new Set([
  "addkeystoagent",
  "addressfamily",
  "ciphers",
  "compression",
  "connectionattempts",
  "connecttimeout",
  "hostkeyalgorithms",
  "hostkeyalias",
  "hostname",
  "identitiesonly",
  "identityfile",
  "kbdinteractiveauthentication",
  "kexalgorithms",
  "loglevel",
  "macs",
  "passwordauthentication",
  "port",
  "preferredauthentications",
  "pubkeyacceptedalgorithms",
  "pubkeyacceptedkeytypes",
  "pubkeyauthentication",
  "requesttty",
  "serveralivecountmax",
  "serveraliveinterval",
  "stricthostkeychecking",
  "tcpkeepalive",
  "usekeychain",
  "user",
]);

export interface RestoreSummary {
  previousKey: string | null;
  skippedConfigHosts: string[];
}

export function readSshBackup(archive: Uint8Array): BackupFiles | null {
  try {
    const entries = unzipSync(archive, {
      filter: ({ name, originalSize }) =>
        name in backupSchema.shape && originalSize <= maxFileBytes,
    });
    const backup = backupSchema.parse(
      Object.fromEntries(
        Object.entries(entries).map(([name, bytes]) => [
          name,
          JSON.parse(strFromU8(bytes)),
        ]),
      ),
    );
    const { hostKey } = backup["ipad.json"];
    const keyIsReadable = !(
      utils.parseKey(backup["key.json"].privateKey) instanceof Error
    );
    const knownHostsAreTheIpad = backup["known-hosts.json"].entries.every(
      ({ type, key }) => type === hostKey?.type && key === hostKey.key,
    );
    return keyIsReadable && knownHostsAreTheIpad ? backup : null;
  } catch {
    return null;
  }
}

function names(host: string): string[] {
  return host.split(/\s+/);
}

function isRestorable({ host, options }: ConfigHost): boolean {
  return (
    names(host).every((name) => literalHostName.test(name)) &&
    options.every(({ name }) => restorableOptions.has(name.toLowerCase()))
  );
}

function keyOf(publicKey: string): string {
  return publicKey.trim().split(/\s+/).slice(0, 2).join(" ");
}

function choosePublicKey(privateKey: string, publicKey: string | null): string {
  const derived = derivePublicKey(privateKey) ?? "";
  return publicKey !== null &&
    publicKeyLine.test(publicKey) &&
    keyOf(publicKey) === keyOf(derived)
    ? publicKey
    : derived;
}

function lineBreakAfter(text: string): string {
  return text === "" || text.endsWith("\n") ? "" : "\n";
}

function shortenHome(file: string): string {
  return file.replace(os.homedir(), "~");
}

export async function applySshBackup(
  backup: BackupFiles,
  confirmReplace: () => Promise<boolean>,
): Promise<RestoreSummary | null> {
  const { privateKey, publicKey } = backup["key.json"];
  const currentKey = await readText(keyPath);
  const currentPublicKey = await readText(publicKeyPath);
  const knownHosts = (await readText(knownHostsPath)) ?? "";
  const config = (await readText(configPath)) ?? "";

  const knownHostLines = new Set(
    knownHosts
      .split("\n")
      .map((line) => line.trim().split(/\s+/).slice(0, 3).join(" ")),
  );
  const newKnownHosts = [
    ...new Set(
      backup["known-hosts.json"].entries.map(
        ({ hosts, type, key }) => `${hosts} ${type} ${key}`,
      ),
    ),
  ].filter((line) => !knownHostLines.has(line));

  const takenNames = new Set(
    listConfigHosts(config).flatMap(({ host }) => names(host)),
  );
  const newConfigHosts: ConfigHost[] = [];
  const skippedConfigHosts: string[] = [];
  for (const configHost of backup["ssh-config.json"].hosts) {
    if (names(configHost.host).some((name) => takenNames.has(name))) {
      continue;
    }
    if (isRestorable(configHost)) {
      newConfigHosts.push(configHost);
      names(configHost.host).forEach((name) => takenNames.add(name));
    } else {
      skippedConfigHosts.push(configHost.host);
    }
  }

  const keyDiffers = currentKey !== null && currentKey !== privateKey;
  if (keyDiffers && !(await confirmReplace())) {
    return null;
  }

  await mkdir(sshDirectory, { recursive: true, mode: ownerOnlyDirectory });
  let previousKey: string | null = null;
  if (keyDiffers) {
    const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
    previousKey = `${keyPath}.replaced-${stamp}`;
    await rename(keyPath, previousKey);
    if (currentPublicKey !== null) {
      await rename(publicKeyPath, `${previousKey}.pub`);
    }
  }
  if (currentKey !== privateKey) {
    await writeFile(keyPath, privateKey, { mode: ownerOnly, flag: "wx" });
  }
  if (currentKey !== privateKey || currentPublicKey === null) {
    await writeFile(publicKeyPath, choosePublicKey(privateKey, publicKey), {
      mode: readableByAll,
    });
  }
  if (newKnownHosts.length > 0) {
    await appendFile(
      knownHostsPath,
      `${lineBreakAfter(knownHosts)}${newKnownHosts.join("\n")}\n`,
      { mode: ownerOnly },
    );
  }
  if (newConfigHosts.length > 0) {
    const blocks = newConfigHosts.map(({ host, options }) =>
      [
        `Host ${host}`,
        ...options.map(({ name, value }) => `    ${name} ${value}`),
      ].join("\n"),
    );
    await appendFile(
      configPath,
      `${config.trim() === "" ? "" : `${lineBreakAfter(config)}\n`}${blocks.join("\n\n")}\n`,
      { mode: ownerOnly },
    );
  }

  return {
    previousKey: previousKey && shortenHome(previousKey),
    skippedConfigHosts,
  };
}
