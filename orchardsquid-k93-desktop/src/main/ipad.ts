import type { Socket } from "node:net";

import { build, parse } from "plist";
import { z } from "zod";

import type { Ipad } from "@/bridge.ts";
import {
  clientName,
  findUsbDevice,
  openPort,
  readExactly,
} from "@/main/usbmux.ts";

export const k93UsbProductId = 0x129f;
const lockdownPort = 62078;
const lengthSize = 4;

const identitySchema = z.object({
  Value: z.object({
    DeviceName: z.string(),
    ProductType: z.string(),
    HardwareModel: z.string(),
    ProductVersion: z.string(),
    BuildVersion: z.string(),
    WiFiAddress: z.string(),
    UniqueDeviceID: z.string(),
  }),
});

export async function openIpadPort(port: number): Promise<Socket | null> {
  const deviceId = await findUsbDevice(k93UsbProductId);
  return deviceId === undefined ? null : openPort(deviceId, port);
}

export async function findIpad(): Promise<Ipad | null> {
  const socket = await openIpadPort(lockdownPort);
  if (!socket) {
    return null;
  }
  try {
    const request = Buffer.from(
      build({ Label: clientName, Request: "GetValue" }),
    );
    const length = Buffer.alloc(lengthSize);
    length.writeUInt32BE(request.length);
    socket.write(Buffer.concat([length, request]));
    const replyLength = (await readExactly(socket, lengthSize)).readUInt32BE();
    const reply = await readExactly(socket, replyLength);
    const { Value } = identitySchema.parse(parse(reply.toString()));
    return {
      name: Value.DeviceName,
      productType: Value.ProductType,
      hardwareModel: Value.HardwareModel,
      productVersion: Value.ProductVersion,
      buildVersion: Value.BuildVersion,
      wifiAddress: Value.WiFiAddress,
      udid: Value.UniqueDeviceID,
    };
  } finally {
    socket.destroy();
  }
}
