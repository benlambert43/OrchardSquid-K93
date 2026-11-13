import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

import type { Bridge, Events, Requests } from "@/bridge.ts";

function invoke<Method extends keyof Requests>(method: Method) {
  return ((...args: Parameters<Requests[Method]>) =>
    ipcRenderer.invoke(method, ...args)) as Requests[Method];
}

function subscribe<Event extends keyof Events>(event: Event) {
  return (listener: (payload: Events[Event]) => void) => {
    const forward = (_event: IpcRendererEvent, payload: Events[Event]) => {
      listener(payload);
    };
    ipcRenderer.on(event, forward);
    return () => {
      ipcRenderer.off(event, forward);
    };
  };
}

const bridge: Bridge = {
  getAppVersion: invoke("getAppVersion"),
  readConnection: invoke("readConnection"),
  chooseTransport: invoke("chooseTransport"),
  readWifiAddress: invoke("readWifiAddress"),
  setWifiAddress: invoke("setWifiAddress"),
  findIpad: invoke("findIpad"),
  readOnboardingComplete: invoke("readOnboardingComplete"),
  readIpadOnboarding: invoke("readIpadOnboarding"),
  readIpadSystem: invoke("readIpadSystem"),
  readIpadBatteryHealth: invoke("readIpadBatteryHealth"),
  readIpadSoftware: invoke("readIpadSoftware"),
  readLaptopToolchain: invoke("readLaptopToolchain"),
  cleanUpIpad: invoke("cleanUpIpad"),
  installZebraOnIpad: invoke("installZebraOnIpad"),
  exportSshBackup: invoke("exportSshBackup"),
  restoreSshBackup: invoke("restoreSshBackup"),
  openShell: invoke("openShell"),
  writeShell: invoke("writeShell"),
  resizeShell: invoke("resizeShell"),
  submitShellPassword: invoke("submitShellPassword"),
  onShellStatus: subscribe("shellStatus"),
  onShellReplay: subscribe("shellReplay"),
  onShellOutput: subscribe("shellOutput"),
};

contextBridge.exposeInMainWorld("bridge", bridge);
