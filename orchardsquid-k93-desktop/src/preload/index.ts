import { contextBridge, ipcRenderer } from "electron";

import type { Bridge } from "@/bridge.ts";

function invoke<Method extends keyof Bridge>(method: Method) {
  return ((...args: Parameters<Bridge[Method]>) =>
    ipcRenderer.invoke(method, ...args)) as Bridge[Method];
}

const bridge: Bridge = {
  getAppVersion: invoke("getAppVersion"),
};

contextBridge.exposeInMainWorld("bridge", bridge);
