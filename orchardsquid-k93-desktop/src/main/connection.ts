import { once } from "node:events";
import net from "node:net";

import { z } from "zod";

import type { Connection, Transport } from "@/bridge.ts";
import { readSetting, writeSetting } from "@/main/settings.ts";
import { findUsbDevice, openPort } from "@/main/usbmux.ts";
import { describeUnreachable } from "@/unreachable.ts";

export const k93UsbProductId = 0x129f;
const wifiTimeoutMs = 5000;

export const transportSchema = z.enum(["wifi", "usb"]);

export const wifiAddressSchema = z
  .string()
  .trim()
  .pipe(z.union([z.ipv4(), z.hostname()]));

export class IpadUnreachableError extends Error {
  readonly connection: Connection;

  constructor(connection: Connection) {
    super(describeUnreachable(connection));
    this.connection = connection;
  }
}

export function readConnection(): Connection {
  const transport = transportSchema
    .catch("wifi")
    .parse(readSetting("transport"));
  return transport === "usb"
    ? { transport }
    : { transport, address: readWifiAddress() };
}

export function chooseTransport(transport: Transport): void {
  writeSetting("transport", transport);
}

export function readWifiAddress(): string | null {
  return readSetting("wifiAddress");
}

export function rememberWifiAddress(address: string): void {
  writeSetting("wifiAddress", address);
}

async function connectOverWifi(
  address: string,
  port: number,
): Promise<net.Socket | null> {
  const socket = net.createConnection({ host: address, port });
  socket.setTimeout(wifiTimeoutMs, () => {
    socket.destroy(new Error("Timed out reaching the iPad over Wi-Fi"));
  });
  try {
    await once(socket, "connect");
    socket.setTimeout(0);
    return socket;
  } catch {
    socket.destroy();
    return null;
  }
}

export async function openIpadPort(
  port: number,
  connection: Connection = readConnection(),
): Promise<net.Socket | null> {
  if (connection.transport === "wifi") {
    return connection.address === null
      ? null
      : connectOverWifi(connection.address, port);
  }
  const deviceId = await findUsbDevice(k93UsbProductId);
  return deviceId === undefined ? null : openPort(deviceId, port);
}
