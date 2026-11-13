import { build, parse } from "plist";
import { z } from "zod";

import type { Ipad } from "@/bridge.ts";
import { clientName, findUsbDevice, openPort } from "@/main/usbmux.ts";

const k93UsbProductId = 0x129f;
const lockdownPort = 62078;
const lengthSize = 4;

const identitySchema = z.object({
  Value: z.object({
    DeviceName: z.string(),
    ProductType: z.string(),
    ProductVersion: z.string(),
  }),
});

export async function findIpad(): Promise<Ipad | null> {
  const deviceId = await findUsbDevice(k93UsbProductId);
  if (deviceId === undefined) {
    return null;
  }
  const { socket, read } = await openPort(deviceId, lockdownPort);
  try {
    const request = Buffer.from(
      build({ Label: clientName, Request: "GetValue" }),
    );
    const length = Buffer.alloc(lengthSize);
    length.writeUInt32BE(request.length);
    socket.write(Buffer.concat([length, request]));
    const reply = await read((await read(lengthSize)).readUInt32BE());
    const { Value } = identitySchema.parse(parse(reply.toString()));
    return {
      name: Value.DeviceName,
      productType: Value.ProductType,
      productVersion: Value.ProductVersion,
    };
  } finally {
    socket.destroy();
  }
}
