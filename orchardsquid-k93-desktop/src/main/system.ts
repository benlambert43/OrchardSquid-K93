import type { Client } from "ssh2";

import type {
  Connection,
  IpadBatteryHealth,
  IpadReport,
  IpadSoftwareReport,
  IpadSystem,
  IpadSystemReport,
  Unreachable,
  WifiCheck,
} from "@/bridge.ts";
import {
  IpadUnreachableError,
  readConnection,
  rememberWifiAddress,
} from "@/main/connection.ts";
import { findIpadOverUsb } from "@/main/ipad.ts";
import { connectSsh, SignInRefusedError } from "@/main/ssh.ts";
import { readBattery } from "@/main/system/battery.ts";
import { readBatteryHealth } from "@/main/system/batteryHealth.ts";
import { readCpu } from "@/main/system/cpu.ts";
import { readCrashReports } from "@/main/system/crashReports.ts";
import { readIdentity } from "@/main/system/identity.ts";
import { readNetwork } from "@/main/system/network.ts";
import { readSoftware } from "@/main/system/software.ts";
import { readStats } from "@/main/system/stats.ts";

type Reached<Reading> =
  { state: "ok"; reading: Reading } | { state: "signed-out" } | Unreachable;

let turn: Promise<unknown> = Promise.resolve();

function inTurn<Result>(task: () => Promise<Result>): Promise<Result> {
  const result = turn.then(task);
  turn = result.catch(() => undefined);
  return result;
}

async function reach<Reading>(
  read: (client: Client) => Promise<Reading>,
  connection?: Connection,
): Promise<Reached<Reading>> {
  try {
    const client = await connectSsh(undefined, connection);
    try {
      return { state: "ok", reading: await read(client) };
    } finally {
      client.end();
    }
  } catch (error) {
    if (error instanceof IpadUnreachableError) {
      return { state: "unreachable", connection: error.connection };
    }
    if (error instanceof SignInRefusedError) {
      return { state: "signed-out" };
    }
    throw error;
  }
}

async function optional<Reading>(
  name: string,
  reading: Promise<Reading>,
): Promise<Reading | null> {
  try {
    return await reading;
  } catch (error) {
    console.error(`The iPad's ${name} could not be read`, error);
    return null;
  }
}

async function readSystem(client: Client): Promise<IpadSystem> {
  const stats = await readStats(client);
  const [battery, network, crashReports] = await Promise.all([
    optional("battery", readBattery(client)),
    optional("network", readNetwork(client)),
    optional("crash reports", readCrashReports(client)),
  ]);
  const cpu = await readCpu(client);
  if (network?.address) {
    rememberWifiAddress(network.address);
  }
  return { ...stats, cpu, battery, network, crashReports };
}

export async function readIpadSystem(): Promise<IpadSystemReport> {
  const reached = await inTurn(() => reach(readSystem));
  return reached.state === "ok"
    ? { state: "ok", system: reached.reading }
    : reached;
}

export async function readIpadBatteryHealth(): Promise<IpadBatteryHealth | null> {
  const reached = await inTurn(() => reach(readBatteryHealth));
  return reached.state === "ok" ? reached.reading : null;
}

export async function readIpadSoftware(): Promise<IpadSoftwareReport> {
  const reached = await inTurn(() => reach(readSoftware));
  return reached.state === "ok"
    ? { state: "ok", software: reached.reading }
    : reached;
}

export async function findIpad(): Promise<IpadReport> {
  const connection = readConnection();
  if (connection.transport === "usb") {
    const ipad = await findIpadOverUsb();
    return ipad
      ? { state: "ok", ipad, connection }
      : { state: "unreachable", connection };
  }
  const reached = await inTurn(() =>
    reach((client) => readIdentity(client), connection),
  );
  return reached.state === "ok"
    ? { state: "ok", ipad: reached.reading, connection }
    : reached;
}

export async function checkWifiAddress(address: string): Promise<WifiCheck> {
  rememberWifiAddress(address);
  try {
    const reached = await inTurn(() =>
      reach(() => Promise.resolve(), { transport: "wifi", address }),
    );
    return reached.state === "ok" ? "connected" : reached.state;
  } catch (error) {
    console.error("The iPad could not be reached at the new address", error);
    return "failed";
  }
}
