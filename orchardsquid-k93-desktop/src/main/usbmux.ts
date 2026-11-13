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

export interface Connection {
  socket: net.Socket;
  read: (size: number) => Promise<Buffer>;
}

async function connect(): Promise<Connection> {
  const socket = net.createConnection(socketPath);
  socket.setTimeout(timeoutMs, () => {
    socket.destroy(new Error("Timed out waiting for a reply over USB"));
  });
  await once(socket, "connect");
  const chunks = socket[Symbol.asyncIterator]();
  let buffered = Buffer.alloc(0);
  return {
    socket,
    async read(size) {
      while (buffered.length < size) {
        const chunk = await chunks.next();
        if (chunk.done) {
          throw new Error("The USB connection closed before the reply ended");
        }
        buffered = Buffer.concat([buffered, chunk.value as Buffer]);
      }
      const bytes = buffered.subarray(0, size);
      buffered = buffered.subarray(size);
      return bytes;
    },
  };
}

async function request(
  { socket, read }: Connection,
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
  const replySize = (await read(headerSize)).readUInt32LE(0);
  return parse((await read(replySize - headerSize)).toString());
}

function toNetworkByteOrder(port: number): number {
  return ((port & 0xff) << 8) | (port >> 8);
}

export async function findUsbDevice(
  productId: number,
): Promise<number | undefined> {
  const connection = await connect();
  try {
    const { DeviceList } = deviceListSchema.parse(
      await request(connection, { MessageType: "ListDevices" }),
    );
    return DeviceList.find(
      ({ Properties }) =>
        Properties.ConnectionType === "USB" &&
        Properties.ProductID === productId,
    )?.DeviceID;
  } finally {
    connection.socket.destroy();
  }
}

export async function openPort(
  deviceId: number,
  port: number,
): Promise<Connection> {
  const connection = await connect();
  try {
    const result = resultSchema.parse(
      await request(connection, {
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
    return connection;
  } catch (error) {
    connection.socket.destroy();
    throw error;
  }
}
