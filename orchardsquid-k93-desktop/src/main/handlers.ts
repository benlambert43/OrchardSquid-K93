import { app } from "electron";

import type { Bridge } from "@/bridge.ts";
import { findIpad } from "@/main/ipad.ts";

type Handlers = {
  [Method in keyof Bridge]: (...args: unknown[]) => ReturnType<Bridge[Method]>;
};

export const handlers: Handlers = {
  getAppVersion: () => Promise.resolve(app.getVersion()),
  findIpad,
};
