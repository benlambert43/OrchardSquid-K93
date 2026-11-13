import type { Client } from "ssh2";

import type { IpadNetwork, IpadWifi } from "@/bridge.ts";
import { runEach } from "@/main/ssh.ts";

const wifiInterface = "en0";

function show(key: string): string {
  return `echo 'show ${key}' | scutil`;
}

const commands = {
  address: `ipconfig getifaddr ${wifiInterface}`,
  route: show("State:/Network/Global/IPv4"),
  dns: show("State:/Network/Global/DNS"),
  wifi: show(`State:/Network/Interface/${wifiInterface}/AirPort`),
};

function text(dictionary: string, key: string): string | null {
  const pattern = new RegExp(String.raw`^\s*${key} : (.+)$`, "m");
  return pattern.exec(dictionary)?.[1] ?? null;
}

function number(dictionary: string, key: string): number | null {
  const pattern = new RegExp(String.raw`^\s*${key} : (-?\d+)$`, "m");
  const digits = pattern.exec(dictionary)?.[1];
  return digits === undefined ? null : Number(digits);
}

function parseWifi(dictionary: string): IpadWifi | null {
  const name = text(dictionary, "SSID_STR");
  const channel = number(dictionary, "CHANNEL");
  const signalDbm = number(dictionary, "RSSI_CTL_AGR");
  const rateMbps = number(dictionary, "RATE");
  return name === null ||
    channel === null ||
    signalDbm === null ||
    rateMbps === null
    ? null
    : { name, channel, signalDbm, rateMbps };
}

function parseDnsServers(dictionary: string): string[] {
  const servers =
    /ServerAddresses : <array> \{([^}]*)\}/.exec(dictionary)?.[1] ?? "";
  return [
    ...new Set(
      Array.from(
        servers.matchAll(/^\s*\d+ : (\S+)$/gm),
        ([, server = ""]) => server,
      ),
    ),
  ];
}

export async function readNetwork(client: Client): Promise<IpadNetwork> {
  const outputs = await runEach(client, commands);
  return {
    address: outputs.address.trim() || null,
    router: text(outputs.route, "Router"),
    dnsServers: parseDnsServers(outputs.dns),
    wifi: parseWifi(outputs.wifi),
  };
}
