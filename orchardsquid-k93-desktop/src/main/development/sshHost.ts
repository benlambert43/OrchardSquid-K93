import type { SshHost, SshHostOption, SshHostTest } from "@/bridge.ts";
import { developmentTarget } from "@/developmentSetup.ts";
import { shortenHome } from "@/main/development/paths.ts";
import { lastLines, runProcess } from "@/main/development/process.ts";
import { tunnelAddress } from "@/main/development/tunnel.ts";
import { keyPath, username } from "@/main/ssh.ts";
import {
  appendConfigHosts,
  configPath,
  listConfigHosts,
  readText,
} from "@/main/sshFiles.ts";

const sshFile = "/usr/bin/ssh";
const testTimeoutMs = 30_000;
const tunnelAddresses = [tunnelAddress, "localhost"];
const changedHostKey = "REMOTE HOST IDENTIFICATION HAS CHANGED";
const { sshHost: name, usbPort } = developmentTarget;

const options: SshHostOption[] = [
  { name: "HostName", value: tunnelAddress },
  { name: "Port", value: String(usbPort) },
  { name: "User", value: username },
  { name: "IdentityFile", value: shortenHome(keyPath) },
  { name: "HostKeyAlgorithms", value: "+ssh-rsa" },
];

function readOption(
  entry: SshHostOption[] | null,
  option: string,
): string | undefined {
  return entry?.find((known) => known.name.toLowerCase() === option)?.value;
}

function readHost(config: string): SshHost {
  const entry =
    listConfigHosts(config).find(({ host }) => host.split(/\s+/).includes(name))
      ?.options ?? null;
  return {
    name,
    file: shortenHome(configPath),
    options: entry,
    pointsAtTunnel:
      tunnelAddresses.includes(readOption(entry, "hostname") ?? "") &&
      readOption(entry, "port") === String(usbPort),
  };
}

export async function readSshHost(): Promise<SshHost> {
  return readHost((await readText(configPath)) ?? "");
}

export async function addSshHost(): Promise<SshHost> {
  const config = (await readText(configPath)) ?? "";
  if (readHost(config).options !== null) {
    return readHost(config);
  }
  await appendConfigHosts(config, [{ host: name, options }]);
  return readSshHost();
}

export async function testSshHost(): Promise<SshHostTest> {
  const { code, stdout, output } = await runProcess(
    sshFile,
    [
      "-o",
      "BatchMode=yes",
      "-o",
      "ConnectTimeout=10",
      "-o",
      "StrictHostKeyChecking=accept-new",
      "-o",
      "LogLevel=ERROR",
      name,
      "sysctl -n hw.machine",
    ],
    { quietTimeoutMs: testTimeoutMs },
  );
  const machine = stdout.trim();
  if (code === 0 && machine) {
    return { state: "connected", machine };
  }
  if (output.includes(changedHostKey)) {
    const { options: entry } = await readSshHost();
    const address = readOption(entry, "hostname") ?? tunnelAddress;
    const port = readOption(entry, "port") ?? String(usbPort);
    return { state: "host-key-changed", knownHost: `[${address}]:${port}` };
  }
  return { state: "failed", output: lastLines(output) };
}
