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

export interface IpadSystem {
  kernel: string;
  uptimeSeconds: number;
  loadAverage: number;
  memory: Usage;
  volumes: (Usage & { name: string })[];
  processes: number;
  packages: number;
}

export type IpadSystemReport =
  | { state: "ok"; system: IpadSystem }
  | { state: "signed-out" }
  | { state: "unplugged" };

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
