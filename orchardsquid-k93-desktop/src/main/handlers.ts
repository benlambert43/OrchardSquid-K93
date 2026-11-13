import { app } from "electron";
import { z } from "zod";

import type { Requests } from "@/bridge.ts";
import { exportSshBackup, restoreSshBackup } from "@/main/backupDialogs.ts";
import {
  chooseTransport,
  readConnection,
  readWifiAddress,
  transportSchema,
  wifiAddressSchema,
} from "@/main/connection.ts";
import { readLaptopToolchain } from "@/main/development.ts";
import {
  openShell,
  resizeShell,
  submitShellPassword,
  writeShell,
} from "@/main/shell.ts";
import {
  checkWifiAddress,
  cleanUpIpad,
  findIpad,
  installZebraOnIpad,
  readIpadBatteryHealth,
  readIpadOnboarding,
  readIpadSoftware,
  readIpadSystem,
  readOnboardingComplete,
} from "@/main/system.ts";

type Handlers = {
  [Method in keyof Requests]: (
    ...args: unknown[]
  ) => ReturnType<Requests[Method]> | Awaited<ReturnType<Requests[Method]>>;
};

const terminalSizeSchema = z.object({
  cols: z.int().min(1).max(1000),
  rows: z.int().min(1).max(1000),
});

const textSchema = z.string();

export const handlers: Handlers = {
  getAppVersion: () => app.getVersion(),
  readConnection,
  chooseTransport: (transport) => {
    chooseTransport(transportSchema.parse(transport));
  },
  readWifiAddress,
  setWifiAddress: (address) =>
    checkWifiAddress(wifiAddressSchema.parse(address)),
  findIpad,
  readOnboardingComplete,
  readIpadOnboarding,
  readIpadSystem,
  readIpadBatteryHealth,
  readIpadSoftware,
  readLaptopToolchain,
  cleanUpIpad,
  installZebraOnIpad,
  exportSshBackup,
  restoreSshBackup,
  openShell: (size) => {
    openShell(terminalSizeSchema.parse(size));
  },
  writeShell: (input) => {
    writeShell(textSchema.parse(input));
  },
  resizeShell: (size) => {
    resizeShell(terminalSizeSchema.parse(size));
  },
  submitShellPassword: (password) => {
    submitShellPassword(textSchema.parse(password));
  },
};
