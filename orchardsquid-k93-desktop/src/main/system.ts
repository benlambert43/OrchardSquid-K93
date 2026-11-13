import type { Client } from "ssh2";

import type {
  CleanUpProgress,
  Connection,
  IpadAppChangeReport,
  IpadAppsReport,
  IpadBatteryHealth,
  IpadCleanUpReport,
  IpadDevelopmentReport,
  IpadOnboarding,
  IpadReport,
  IpadSoftwareReport,
  IpadSystem,
  IpadSystemReport,
  PackageInstallReport,
  Unreachable,
  WifiCheck,
  ZebraInstallReport,
} from "@/bridge.ts";
import type { CleanUpOption } from "@/cleanUpSteps.ts";
import type { AppAction } from "@/appActions.ts";
import {
  IpadUnreachableError,
  probeIpadPort,
  readConnection,
  rememberWifiAddress,
} from "@/main/connection.ts";
import {
  type ReportProgress,
  withProgress,
} from "@/main/development/progress.ts";
import { findIpadOverUsb } from "@/main/ipad.ts";
import { readSetting, writeSetting } from "@/main/settings.ts";
import {
  connectSsh,
  keyPath,
  SignInRefusedError,
  sshPort,
} from "@/main/ssh.ts";
import { derivePublicKey, readText } from "@/main/sshFiles.ts";
import { changeApp, readApps } from "@/main/system/apps.ts";
import { readBattery } from "@/main/system/battery.ts";
import { readBatteryHealth } from "@/main/system/batteryHealth.ts";
import { cleanUp } from "@/main/system/cleanUp.ts";
import { readCpu } from "@/main/system/cpu.ts";
import { readCrashReports } from "@/main/system/crashReports.ts";
import { installDeb } from "@/main/system/deb.ts";
import { readDevelopment } from "@/main/system/development.ts";
import { readIdentity } from "@/main/system/identity.ts";
import { readNetwork } from "@/main/system/network.ts";
import { readDefaultPasswordAccounts } from "@/main/system/passwords.ts";
import { readSoftware } from "@/main/system/software.ts";
import { readStats } from "@/main/system/stats.ts";
import { installZebra } from "@/main/system/zebra.ts";
import { clientName } from "@/main/usbmux.ts";

const onboardingSetting = "onboardingComplete";
const packageFile = "/private/var/tmp/orchardsquid-k93-package.deb";

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

export async function cleanUpIpad(
  options: CleanUpOption[],
  report: (progress: CleanUpProgress) => void,
): Promise<IpadCleanUpReport> {
  const reached = await inTurn(() =>
    reach((client) => cleanUp(client, options, report)),
  );
  return reached.state === "ok"
    ? { state: "ok", cleanUp: reached.reading }
    : reached;
}

export async function readIpadApps(): Promise<IpadAppsReport> {
  const reached = await inTurn(() => reach(readApps));
  return reached.state === "ok"
    ? { state: "ok", apps: reached.reading }
    : reached;
}

export async function changeIpadApp(
  id: string,
  action: AppAction,
): Promise<IpadAppChangeReport> {
  const reached = await inTurn(() =>
    reach((client) => changeApp(client, id, action)),
  );
  return reached.state === "ok" ? reached.reading : reached;
}

export async function installZebraOnIpad(): Promise<ZebraInstallReport> {
  const reached = await inTurn(() => reach(installZebra));
  return reached.state === "ok" ? reached.reading : reached;
}

export async function readIpadDevelopment(): Promise<IpadDevelopmentReport> {
  const connection = readConnection();
  const reached = await inTurn(() => reach(readDevelopment, connection));
  return reached.state === "ok"
    ? { state: "ok", development: { connection, ...reached.reading } }
    : reached;
}

export async function installPackageOnIpad(
  file: string,
  contents: Buffer,
  report: ReportProgress,
): Promise<PackageInstallReport> {
  const reached = await inTurn(() =>
    reach((client) =>
      withProgress("package", "copy", report, (announce) =>
        installDeb(client, contents, packageFile, (step, fraction) => {
          announce(step, file, fraction);
        }),
      ),
    ),
  );
  return reached.state === "ok" ? { ...reached.reading, file } : reached;
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

export function readOnboardingComplete(): boolean {
  return readSetting(onboardingSetting) === "true";
}

export async function readIpadOnboarding(): Promise<IpadOnboarding> {
  const connection = readConnection();
  const privateKey = await readText(keyPath);
  const port = await inTurn(() => probeIpadPort(sshPort, connection));
  const reached =
    port === "open"
      ? await inTurn(() => reach(readDefaultPasswordAccounts, connection))
      : null;
  const authorizedKey =
    privateKey === null
      ? null
      : (derivePublicKey(privateKey, clientName)?.trim() ?? null);
  const signedIn = reached?.state === "ok";
  const defaultPasswordAccounts =
    reached?.state === "ok" ? reached.reading : [];
  if (authorizedKey === null || signedIn || reached?.state === "signed-out") {
    const complete =
      authorizedKey !== null &&
      signedIn &&
      defaultPasswordAccounts.length === 0;
    writeSetting(onboardingSetting, String(complete));
  }
  return {
    connection,
    sshPort: port,
    authorizedKey,
    signedIn,
    defaultPasswordAccounts,
    complete: readOnboardingComplete(),
  };
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
