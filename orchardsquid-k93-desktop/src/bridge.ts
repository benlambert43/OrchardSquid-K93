export interface Ipad {
  name: string;
  productType: string;
  productVersion: string;
}

export interface Bridge {
  getAppVersion: () => Promise<string>;
  findIpad: () => Promise<Ipad | null>;
}

declare global {
  interface Window {
    bridge: Bridge;
  }
}
