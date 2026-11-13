import { once } from "node:events";
import net from "node:net";

import { build, parse, type PlistValue } from "plist";
import { z } from "zod";

export const clientName = "OrchardSquid-K93";

const socketPath = "/var/run/usbmuxd";
const timeoutMs = 5000;
const headerSize = 16;
const protocolVersion = 1;
const plistMessageType = 8;
const tag = 1;

const deviceListSchema = z.object({
  DeviceList: z.array(
    z.object({
      DeviceID: z.number(),
      Properties: z.object({
        ConnectionType: z.string(),
        ProductID: z.number().optional(),
      }),
    }),
  ),
});

const resultSchema = z.object({ Number: z.number() });

export function readExactly(socket: net.Socket, size: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    function stop() {
      clearTimeout(timer);
      socket.off("readable", onReadable);
      socket.off("close", onClose);
      socket.off("error", onError);
    }
    function onReadable() {
      const bytes = socket.read(size) as Buffer | null;
      if (bytes?.length === size) {
        stop();
        resolve(bytes);
      }
    }
    function onClose() {
      stop();
      reject(new Error("The USB connection closed before the reply ended"));
    }
    function onError(error: Error) {
      stop();
      reject(error);
    }
    const timer = setTimeout(() => {
      socket.destroy(new Error("Timed out waiting for a reply over USB"));
    }, timeoutMs);
    socket.on("readable", onReadable);
    socket.on("close", onClose);
    socket.on("error", onError);
    if (socket.destroyed) {
      onClose();
    } else {
      onReadable();
    }
  });
}

async function connect(): Promise<net.Socket> {
  const socket = net.createConnection(socketPath);
  await once(socket, "connect");
  return socket;
}

async function request(
  socket: net.Socket,
  message: Record<string, PlistValue>,
): Promise<PlistValue> {
  const payload = Buffer.from(
    build({
      ClientVersionString: clientName,
      ProgName: clientName,
      kLibUSBMuxVersion: 3,
      ...message,
    }),
  );
  const header = Buffer.alloc(headerSize);
  header.writeUInt32LE(headerSize + payload.length, 0);
  header.writeUInt32LE(protocolVersion, 4);
  header.writeUInt32LE(plistMessageType, 8);
  header.writeUInt32LE(tag, 12);
  socket.write(Buffer.concat([header, payload]));
  const replySize = (await readExactly(socket, headerSize)).readUInt32LE(0);
  return parse((await readExactly(socket, replySize - headerSize)).toString());
}

function toNetworkByteOrder(port: number): number {
  return ((port & 0xff) << 8) | (port >> 8);
}

export async function findUsbDevice(
  productId: number,
): Promise<number | undefined> {
  const socket = await connect();
  try {
    const { DeviceList } = deviceListSchema.parse(
      await request(socket, { MessageType: "ListDevices" }),
    );
    return DeviceList.find(
      ({ Properties }) =>
        Properties.ConnectionType === "USB" &&
        Properties.ProductID === productId,
    )?.DeviceID;
  } finally {
    socket.destroy();
  }
}

export async function openPort(
  deviceId: number,
  port: number,
): Promise<net.Socket> {
  const socket = await connect();
  try {
    const result = resultSchema.parse(
      await request(socket, {
        MessageType: "Connect",
        DeviceID: deviceId,
        PortNumber: toNetworkByteOrder(port),
      }),
    );
    if (result.Number !== 0) {
      throw new Error(
        `usbmuxd refused port ${String(port)} with result ${String(result.Number)}`,
      );
    }
    return socket;
  } catch (error) {
    socket.destroy();
    throw error;
  }
}
