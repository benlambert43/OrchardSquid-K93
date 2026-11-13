import type { Client } from "ssh2";

import type {
  IpadBatteryHealth,
  IpadSoftwareReport,
  IpadSystem,
  IpadSystemReport,
} from "@/bridge.ts";
import {
  connectSsh,
  IpadUnpluggedError,
  SignInRefusedError,
} from "@/main/ssh.ts";
import { readBattery } from "@/main/system/battery.ts";
import { readBatteryHealth } from "@/main/system/batteryHealth.ts";
import { readCpu } from "@/main/system/cpu.ts";
import { readCrashReports } from "@/main/system/crashReports.ts";
import { readNetwork } from "@/main/system/network.ts";
import { readSoftware } from "@/main/system/software.ts";
import { readStats } from "@/main/system/stats.ts";

type Reached<Reading> =
  | { state: "ok"; reading: Reading }
  | { state: "signed-out" }
  | { state: "unplugged" };

let turn: Promise<unknown> = Promise.resolve();

function inTurn<Result>(task: () => Promise<Result>): Promise<Result> {
  const result = turn.then(task);
  turn = result.catch(() => undefined);
  return result;
}

async function reach<Reading>(
  read: (client: Client) => Promise<Reading>,
): Promise<Reached<Reading>> {
  try {
    const client = await connectSsh();
    try {
      return { state: "ok", reading: await read(client) };
    } finally {
      client.end();
    }
  } catch (error) {
    if (error instanceof IpadUnpluggedError) {
      return { state: "unplugged" };
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
