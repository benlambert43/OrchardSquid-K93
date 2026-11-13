import type { AppAction } from "@/appActions.ts";
import type { CleanUpOption, CleanUpStep } from "@/cleanUpSteps.ts";
import type {
  DevelopmentStep,
  DevelopmentTask,
  LaptopInstallOption,
  LaptopToolName,
} from "@/developmentSetup.ts";

export interface Ipad {
  name: string;
  productType: string;
  hardwareModel: string;
  productVersion: string;
  buildVersion: string;
  wifiAddress: string | null;
  udid: string | null;
}

export type Transport = "wifi" | "usb";

export type Connection =
  { transport: "usb" } | { transport: "wifi"; address: string | null };

export interface Unreachable {
  state: "unreachable";
  connection: Connection;
}

export type IpadReport =
  | { state: "ok"; ipad: Ipad; connection: Connection }
  | { state: "signed-out" }
  | Unreachable;

export type WifiCheck = "connected" | "signed-out" | "unreachable" | "failed";

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

export interface IpadOffer {
  source: string;
  version: string;
}

export interface IpadDeveloperSetup {
  sources: string[];
  offers: Partial<Record<string, IpadOffer[]>>;
}

export type IpadPort = "open" | "closed" | "absent";

export interface IpadOnboarding {
  connection: Connection;
  sshPort: IpadPort;
  authorizedKey: string | null;
  signedIn: boolean;
  defaultPasswordAccounts: string[];
  complete: boolean;
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
  userDefaultPackages: number;
  generatedPackages: number;
  developerSetup: IpadDeveloperSetup;
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
  { state: "ok"; system: IpadSystem } | { state: "signed-out" } | Unreachable;

export type IpadSoftwareReport =
  | { state: "ok"; software: IpadSoftware }
  | { state: "signed-out" }
  | Unreachable;

export interface LaptopTool {
  file: string;
  version: string | null;
}

export interface XcodeTool {
  folder: string;
  full: boolean;
  version: string | null;
  build: string | null;
  compiler: string | null;
  linker: string | null;
  armv7: boolean;
}

export interface ShellSetting {
  file: string | null;
  value: string | null;
}

export interface TheosTool {
  folder: string;
  state: "installed" | "absent" | "occupied";
  version: string | null;
  commit: string | null;
  committedAt: string | null;
  branch: string | null;
  source: string | null;
  sdks: string[];
  shell: ShellSetting;
}

export interface SdkTool {
  folder: string;
  version: string | null;
  architectures: string[];
}

export interface LaptopToolchain {
  xcode: XcodeTool | null;
  homebrew: LaptopTool | null;
  theos: TheosTool;
  sdk: SdkTool | null;
  ldid: LaptopTool | null;
  xz: LaptopTool | null;
}

export type LaptopInstall =
  | { state: "installed" }
  | { state: "busy" }
  | { state: "occupied" }
  | { state: "unavailable" }
  | { state: "mismatch" }
  | { state: "failed"; output: string };

export interface DevelopmentProgress {
  task: DevelopmentTask;
  step: DevelopmentStep;
  item: string | null;
  fraction: number | null;
  seconds: number;
}

export interface UsbTunnel {
  running: boolean;
  port: number;
  attached: boolean;
}

export type UsbTunnelStart =
  { state: "started" } | { state: "port-in-use" } | Unreachable;

export interface SshHostOption {
  name: string;
  value: string;
}

export interface SshHost {
  name: string;
  file: string;
  options: SshHostOption[] | null;
  pointsAtTunnel: boolean;
}

export type SshHostTest =
  | { state: "connected"; machine: string }
  | { state: "host-key-changed"; knownHost: string }
  | { state: "failed"; output: string };

export interface IpadSshServer {
  version: string | null;
  port: number | null;
  passwordSignIn: boolean | null;
  authorizedKeys: number;
}

export interface IpadPackageTool {
  version: string | null;
  architecture: string | null;
}

export interface IpadDevelopment {
  connection: Connection;
  openssh: IpadSshServer;
  dpkg: IpadPackageTool;
}

export type IpadDevelopmentReport =
  | { state: "ok"; development: IpadDevelopment }
  | { state: "signed-out" }
  | Unreachable;

export type PackageInstall =
  | {
      state: "installed";
      file: string;
      package: string | null;
      version: string | null;
      homeScreenRefreshed: boolean;
    }
  | { state: "cancelled" }
  | { state: "invalid"; file: string }
  | { state: "refused"; file: string; output: string };

export type PackageInstallReport =
  PackageInstall | { state: "signed-out" } | Unreachable;

export interface IpadCleanUp {
  moved: string[];
  alreadyDone: number;
  failed: string[];
  freeBeforeBytes: number | null;
  freeAfterBytes: number | null;
}

export type IpadCleanUpReport =
  { state: "ok"; cleanUp: IpadCleanUp } | { state: "signed-out" } | Unreachable;

export interface CleanUpProgress {
  step: CleanUpStep;
  item: string | null;
  fraction: number;
  seconds: number;
}

export type IpadAppKind = "stock" | "package" | "other";

export interface IpadApp {
  id: string;
  name: string;
  version: string | null;
  kind: IpadAppKind;
  package: string | null;
  removed: boolean;
  removable: boolean;
  bytes: number;
  services: string[];
}

export type IpadAppsReport =
  { state: "ok"; apps: IpadApp[] } | { state: "signed-out" } | Unreachable;

export type IpadAppChange =
  | {
      state: "changed";
      homeScreenRefreshed: boolean;
      links: number;
      services: number;
    }
  | { state: "missing" }
  | { state: "refused"; output: string };

export type IpadAppChangeReport =
  IpadAppChange | { state: "signed-out" } | Unreachable;

export type ZebraInstall =
  | { state: "installed"; version: string; homeScreenRefreshed: boolean }
  | { state: "unavailable" }
  | { state: "mismatch" }
  | { state: "refused"; output: string };

export type ZebraInstallReport =
  ZebraInstall | { state: "signed-out" } | Unreachable;

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
  | { state: "open"; transport: Transport }
  | { state: "closed"; reason: string };

export interface Requests {
  getAppVersion: () => Promise<string>;
  readConnection: () => Promise<Connection>;
  chooseTransport: (transport: Transport) => Promise<void>;
  readWifiAddress: () => Promise<string | null>;
  setWifiAddress: (address: string) => Promise<WifiCheck>;
  findIpad: () => Promise<IpadReport>;
  readOnboardingComplete: () => Promise<boolean>;
  readIpadOnboarding: () => Promise<IpadOnboarding>;
  readIpadSystem: () => Promise<IpadSystemReport>;
  readIpadBatteryHealth: () => Promise<IpadBatteryHealth | null>;
  readIpadSoftware: () => Promise<IpadSoftwareReport>;
  readLaptopToolchain: () => Promise<LaptopToolchain>;
  installLaptopTool: (
    tool: LaptopToolName,
    options: LaptopInstallOption[],
  ) => Promise<LaptopInstall>;
  readUsbTunnel: () => Promise<UsbTunnel>;
  startUsbTunnel: () => Promise<UsbTunnelStart>;
  stopUsbTunnel: () => Promise<void>;
  readSshHost: () => Promise<SshHost>;
  addSshHost: () => Promise<SshHost>;
  testSshHost: () => Promise<SshHostTest>;
  readIpadDevelopment: () => Promise<IpadDevelopmentReport>;
  installIpadPackage: () => Promise<PackageInstallReport>;
  cleanUpIpad: (options: CleanUpOption[]) => Promise<IpadCleanUpReport>;
  installZebraOnIpad: () => Promise<ZebraInstallReport>;
  readIpadApps: () => Promise<IpadAppsReport>;
  changeIpadApp: (
    id: string,
    action: AppAction,
  ) => Promise<IpadAppChangeReport>;
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
  cleanUpProgress: CleanUpProgress;
  developmentProgress: DevelopmentProgress;
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
