export interface Bridge {
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    bridge: Bridge;
  }
}
