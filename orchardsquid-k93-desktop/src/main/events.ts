import { BrowserWindow } from "electron";

import type { Events } from "@/bridge.ts";

export function send<Event extends keyof Events>(
  event: Event,
  payload: Events[Event],
): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(event, payload);
  }
}
