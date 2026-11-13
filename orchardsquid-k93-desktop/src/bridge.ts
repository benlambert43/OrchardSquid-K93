export interface Ipad {
  name: string;
  productType: string;
  hardwareModel: string;
  productVersion: string;
  buildVersion: string;
  wifiAddress: string;
  udid: string;
}

export interface Usage {
  usedBytes: number;
  totalBytes: number;
}

export interface IpadProcess {
  pid: number;
  name: string;
  memoryBytes: number;
}

export interface IpadStats {
  kernel: string;
  uptimeSeconds: number;
  loadAverages: number[];
  memory: Usage;
  volumes: (Usage & { name: string })[];
  processes: number;
  topProcesses: IpadProcess[];
}

export interface IpadCpu {
  userFraction: number;
  systemFraction: number;
}

export interface IpadBattery {
  level: number;
  state: "full" | "charging" | "not-charging" | "discharging";
}

export interface IpadBatteryHealth {
  cycleCount: number;
  maxCapacityMah: number;
  designCapacityMah: number;
}

export interface IpadWifi {
  name: string;
  channel: number;
  signalDbm: number;
  rateMbps: number;
}

export interface IpadNetwork {
  address: string | null;
  router: string | null;
  dnsServers: string[];
  wifi: IpadWifi | null;
}

export interface IpadPackage {
  id: string;
  version: string;
  section: string;
  summary: string;
  installedBytes: number | null;
}

export interface IpadSoftware {
  carbon: string | null;
  iocaste: boolean;
  cydia: string | null;
  openssh: string | null;
  openssl: string | null;
  safari: string | null;
  webkit: string | null;
  packages: IpadPackage[];
  generatedPackages: number;
}

export interface IpadCrashReports {
  crashes: number;
  latestCrash: { process: string | null; time: number } | null;
  memoryEvents: number;
  latestMemoryEvent: number | null;
}

export interface IpadSystem extends IpadStats {
  cpu: IpadCpu;
  battery: IpadBattery | null;
  network: IpadNetwork | null;
  crashReports: IpadCrashReports | null;
}

export type IpadSystemReport =
  | { state: "ok"; system: IpadSystem }
  | { state: "signed-out" }
  | { state: "unplugged" };

export type IpadSoftwareReport =
  | { state: "ok"; software: IpadSoftware }
  | { state: "signed-out" }
  | { state: "unplugged" };

export type SshBackupResult =
  | { state: "saved"; path: string; ipadIncluded: boolean }
  | { state: "cancelled" }
  | { state: "no-key" };

export type SshRestoreResult =
  | {
      state: "restored";
      previousKey: string | null;
      skippedConfigHosts: string[];
    }
  | { state: "cancelled" }
  | { state: "invalid" };

export interface TerminalSize {
  cols: number;
  rows: number;
}

export type ShellStatus =
  | { state: "connecting" }
  | { state: "password"; retry: boolean }
  | { state: "open" }
  | { state: "closed"; reason: string };

export interface Requests {
  getAppVersion: () => Promise<string>;
  findIpad: () => Promise<Ipad | null>;
  readIpadSystem: () => Promise<IpadSystemReport>;
  readIpadBatteryHealth: () => Promise<IpadBatteryHealth | null>;
  readIpadSoftware: () => Promise<IpadSoftwareReport>;
  exportSshBackup: () => Promise<SshBackupResult>;
  restoreSshBackup: () => Promise<SshRestoreResult>;
  openShell: (size: TerminalSize) => Promise<void>;
  writeShell: (input: string) => Promise<void>;
  resizeShell: (size: TerminalSize) => Promise<void>;
  submitShellPassword: (password: string) => Promise<void>;
}

export interface Events {
  shellStatus: ShellStatus;
  shellReplay: Uint8Array;
  shellOutput: Uint8Array;
}

export type Subscriptions = {
  [Event in keyof Events as `on${Capitalize<Event>}`]: (
    listener: (payload: Events[Event]) => void,
  ) => () => void;
};

export type Bridge = Requests & Subscriptions;

declare global {
  interface Window {
    bridge: Bridge;
  }
}
