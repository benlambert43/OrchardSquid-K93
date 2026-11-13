import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

import { strToU8, zipSync } from "fflate";

import {
  type BackupFiles,
  backupFormat,
  backupVersion,
  type ConfigHost,
  configHostSchema,
  type KnownHost,
  knownHostSchema,
  type PublicKey,
} from "@/main/backupFormat.ts";
import { findIpad, k93UsbProductId } from "@/main/ipad.ts";
import { keyPath, readHostKey, sshPort, username } from "@/main/ssh.ts";
import {
  configPath,
  derivePublicKey,
  knownHostsPath,
  listConfigHosts,
  publicKeyPath,
  readText,
} from "@/main/sshFiles.ts";

const homePrefix = "~/";

export interface SshBackup {
  archive: Uint8Array;
  ipadIncluded: boolean;
}

function fromHome(file: string): string {
  return file.startsWith(homePrefix)
    ? path.join(os.homedir(), file.slice(homePrefix.length))
    : file;
}

function describeKey(type: string, blob: Buffer): PublicKey {
  const digest = createHash("sha256").update(blob).digest("base64");
  return {
    type,
    key: blob.toString("base64"),
    fingerprint: `SHA256:${digest.replace(/=+$/, "")}`,
  };
}

function describeHostKey(blob: Buffer): PublicKey {
  const typeLength = blob.readUInt32BE(0);
  return describeKey(blob.subarray(4, 4 + typeLength).toString(), blob);
}

function describePublicKey(publicKey: string | null): PublicKey | null {
  const [type, key] = publicKey?.trim().split(/\s+/) ?? [];
  return type && key ? describeKey(type, Buffer.from(key, "base64")) : null;
}

function findKnownHosts(knownHosts: string, hostKey: PublicKey): KnownHost[] {
  return knownHosts.split("\n").flatMap((line) => {
    const [hosts, type, key] = line.trim().split(/\s+/);
    const entry = knownHostSchema.safeParse({ hosts, type, key });
    return entry.success && type === hostKey.type && key === hostKey.key
      ? [entry.data]
      : [];
  });
}

function listAddresses(knownHosts: KnownHost[]): Set<string> {
  return new Set(
    knownHosts.flatMap(({ hosts }) =>
      hosts.split(",").map((host) => /^\[(.+)\]:\d+$/.exec(host)?.[1] ?? host),
    ),
  );
}

function findConfigHosts(config: string, addresses: Set<string>): ConfigHost[] {
  return listConfigHosts(config).filter((configHost) => {
    const read = (name: string) =>
      configHost.options
        .filter((option) => option.name.toLowerCase() === name)
        .map(({ value }) => value);
    const [hostName] = read("hostname");
    return (
      configHostSchema.safeParse(configHost).success &&
      (read("identityfile").some((file) => fromHome(file) === keyPath) ||
        (hostName === undefined ? configHost.host.split(" ") : [hostName]).some(
          (address) => addresses.has(address),
        ))
    );
  });
}

export async function createSshBackup(
  appVersion: string,
): Promise<SshBackup | null> {
  const privateKey = await readText(keyPath);
  if (privateKey === null) {
    return null;
  }
  const publicKey =
    (await readText(publicKeyPath)) ?? derivePublicKey(privateKey);
  const keyDetails = describePublicKey(publicKey);
  const ipad = await findIpad().catch(() => null);
  const hostKeyBlob = ipad ? await readHostKey().catch(() => null) : null;
  const hostKey = hostKeyBlob && describeHostKey(hostKeyBlob);
  const knownHosts = hostKey
    ? findKnownHosts((await readText(knownHostsPath)) ?? "", hostKey)
    : [];
  const configHosts = findConfigHosts(
    (await readText(configPath)) ?? "",
    listAddresses(knownHosts),
  );

  const createdAt = new Date();
  const files = {
    "connection.json": {
      transport: "usb",
      usbProductId: k93UsbProductId,
      port: sshPort,
      username,
    },
    "ipad.json": { ipad, hostKey },
    "key.json": {
      path: `${homePrefix}${path.relative(os.homedir(), keyPath)}`,
      type: keyDetails?.type ?? null,
      fingerprint: keyDetails?.fingerprint ?? null,
      privateKey,
      publicKey,
    },
    "known-hosts.json": { entries: knownHosts },
    "ssh-config.json": { hosts: configHosts },
  } satisfies Omit<BackupFiles, "manifest.json">;
  const manifest: BackupFiles["manifest.json"] = {
    format: backupFormat,
    version: backupVersion,
    createdAt: createdAt.toISOString(),
    appVersion,
    computer: os.hostname(),
    files: Object.keys(files),
  };

  return {
    archive: zipSync(
      Object.fromEntries(
        Object.entries({ "manifest.json": manifest, ...files }).map(
          ([name, content]) => [
            name,
            strToU8(`${JSON.stringify(content, null, 2)}\n`),
          ],
        ),
      ),
      { level: 9, mtime: createdAt },
    ),
    ipadIncluded: hostKey !== null,
  };
}
