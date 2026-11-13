import { once } from "node:events";
import net from "node:net";

import type { UsbTunnel, UsbTunnelStart } from "@/bridge.ts";
import { developmentTarget } from "@/developmentSetup.ts";
import { k93UsbProductId } from "@/main/connection.ts";
import { sshPort } from "@/main/ssh.ts";
import { findUsbDevice, openPort } from "@/main/usbmux.ts";

export const tunnelAddress = "127.0.0.1";

const sockets = new Set<net.Socket>();
let server: net.Server | null = null;

function track(socket: net.Socket, peer?: net.Socket): void {
  sockets.add(socket);
  socket.on("error", () => undefined);
  socket.on("close", () => {
    sockets.delete(socket);
    peer?.destroy();
  });
}

function isAddressInUse(error: unknown): boolean {
  return (
    error instanceof Error && "code" in error && error.code === "EADDRINUSE"
  );
}

async function findDevice(): Promise<number | undefined> {
  try {
    return await findUsbDevice(k93UsbProductId);
  } catch (error) {
    console.error("The USB devices could not be listed", error);
    return undefined;
  }
}

async function forward(local: net.Socket): Promise<void> {
  track(local);
  try {
    const deviceId = await findDevice();
    if (deviceId === undefined) {
      local.destroy();
      return;
    }
    const remote = await openPort(deviceId, sshPort);
    track(remote, local);
    local.on("close", () => {
      remote.destroy();
    });
    if (!sockets.has(local)) {
      remote.destroy();
      return;
    }
    local.pipe(remote);
    remote.pipe(local);
  } catch (error) {
    console.error("The USB tunnel could not reach the iPad", error);
    local.destroy();
  }
}

export async function readUsbTunnel(): Promise<UsbTunnel> {
  return {
    running: server !== null,
    port: developmentTarget.usbPort,
    attached: (await findDevice()) !== undefined,
  };
}

export async function startUsbTunnel(): Promise<UsbTunnelStart> {
  if (server) {
    return { state: "started" };
  }
  if ((await findDevice()) === undefined) {
    return { state: "unreachable", connection: { transport: "usb" } };
  }
  const created = net.createServer((socket) => {
    void forward(socket);
  });
  server = created;
  try {
    created.listen(developmentTarget.usbPort, tunnelAddress);
    await once(created, "listening");
  } catch (error) {
    server = null;
    if (isAddressInUse(error)) {
      return { state: "port-in-use" };
    }
    throw error;
  }
  created.on("error", (error) => {
    console.error("The USB tunnel failed", error);
  });
  return { state: "started" };
}

export function stopUsbTunnel(): void {
  server?.close();
  server = null;
  for (const socket of sockets) {
    socket.destroy();
  }
}
