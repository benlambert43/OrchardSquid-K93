import { app } from "electron";
import { z } from "zod";

import type { DevelopmentProgress, Requests } from "@/bridge.ts";
import { appActions } from "@/appActions.ts";
import { cleanUpOptions } from "@/cleanUpSteps.ts";
import {
  buildOptions,
  laptopInstallOptions,
  laptopTools,
  packageIdPattern,
  projectNamePattern,
  projectTemplates,
} from "@/developmentSetup.ts";
import { exportSshBackup, restoreSshBackup } from "@/main/backupDialogs.ts";
import {
  chooseTransport,
  readConnection,
  readWifiAddress,
  transportSchema,
  wifiAddressSchema,
} from "@/main/connection.ts";
import { readLaptopToolchain } from "@/main/development.ts";
import { installLaptopTool } from "@/main/development/install.ts";
import { installIpadPackage } from "@/main/development/package.ts";
import {
  buildDevelopmentProject,
  createDevelopmentProject,
  editDevelopmentProject,
  openDevelopmentProject,
  readDevelopmentProject,
} from "@/main/development/project.ts";
import {
  addSshHost,
  readSshHost,
  testSshHost,
} from "@/main/development/sshHost.ts";
import {
  readUsbTunnel,
  startUsbTunnel,
  stopUsbTunnel,
} from "@/main/development/tunnel.ts";
import { send } from "@/main/events.ts";
import {
  openShell,
  resizeShell,
  submitShellPassword,
  writeShell,
} from "@/main/shell.ts";
import {
  changeIpadApp,
  checkWifiAddress,
  cleanUpIpad,
  findIpad,
  installZebraOnIpad,
  readIpadApps,
  readIpadBatteryHealth,
  readIpadDevelopment,
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

const cleanUpOptionsSchema = z.array(z.enum(cleanUpOptions));

const appIdSchema = z.string().min(1).max(255);

const appActionSchema = z.enum(appActions);

const laptopToolSchema = z.enum(laptopTools);

const laptopInstallOptionsSchema = z.array(z.enum(laptopInstallOptions));

const projectTemplateSchema = z.enum(
  Object.keys(projectTemplates) as (keyof typeof projectTemplates)[],
);

const projectNameSchema = z
  .string()
  .max(64)
  .regex(new RegExp(`^(?:${projectNamePattern})$`));

const packageIdSchema = z
  .string()
  .max(128)
  .regex(new RegExp(`^(?:${packageIdPattern})$`));

const buildOptionsSchema = z.array(z.enum(buildOptions));

function reportDevelopment(progress: DevelopmentProgress): void {
  send("developmentProgress", progress);
}

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
  installLaptopTool: (tool, options) =>
    installLaptopTool(
      laptopToolSchema.parse(tool),
      laptopInstallOptionsSchema.parse(options),
      reportDevelopment,
    ),
  readUsbTunnel,
  startUsbTunnel,
  stopUsbTunnel,
  readSshHost,
  addSshHost,
  testSshHost,
  readIpadDevelopment,
  installIpadPackage: () => installIpadPackage(reportDevelopment),
  readDevelopmentProject,
  createDevelopmentProject: (template, name, packageId) =>
    createDevelopmentProject(
      projectTemplateSchema.parse(template),
      projectNameSchema.parse(name),
      packageIdSchema.parse(packageId),
    ),
  openDevelopmentProject,
  editDevelopmentProject,
  buildDevelopmentProject: (options) =>
    buildDevelopmentProject(
      buildOptionsSchema.parse(options),
      reportDevelopment,
    ),
  cleanUpIpad: (options) =>
    cleanUpIpad(cleanUpOptionsSchema.parse(options), (progress) => {
      send("cleanUpProgress", progress);
    }),
  installZebraOnIpad,
  readIpadApps,
  changeIpadApp: (id, action) =>
    changeIpadApp(appIdSchema.parse(id), appActionSchema.parse(action)),
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
