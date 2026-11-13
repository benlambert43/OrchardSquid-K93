import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Client, type ParsedKey, utils } from "ssh2";

import type { Connection } from "@/bridge.ts";
import {
  IpadUnreachableError,
  openIpadPort,
  readConnection,
} from "@/main/connection.ts";

export const sshPort = 22;
export const username = "root";
export const keyPath = path.join(os.homedir(), ".ssh", "orchardsquid-k93");
const passwordAttempts = 3;
const handshakeTimeoutMs = 10_000;
const keepaliveIntervalMs = 15_000;
const commandTimeoutMs = 10_000;
const recordSeparator = "\x1e";
const recordSeparatorEscape = String.raw`\036`;

export class SignInRefusedError extends Error {
  constructor() {
    super("The iPad refused the sign-in");
  }
}

export type AskPassword = (retry: boolean) => Promise<string | null>;

async function readKey(): Promise<ParsedKey | null> {
  const file = await readFile(keyPath).catch(() => null);
  if (!file) {
    return null;
  }
  const key = utils.parseKey(file);
  return key instanceof Error ? null : key;
}

export async function connectSsh(
  askPassword?: AskPassword,
  connection: Connection = readConnection(),
): Promise<Client> {
  const socket = await openIpadPort(sshPort, connection);
  if (!socket) {
    throw new IpadUnreachableError(connection);
  }
  const key = await readKey();
  const client = new Client();
  return new Promise((resolve, reject) => {
    let keyOffered = false;
    let passwordsAsked = 0;

    function refuse() {
      client.destroy();
      reject(new SignInRefusedError());
    }

    client.on("ready", () => {
      resolve(client);
    });
    client.on("error", reject);
    client.on("close", () => {
      reject(new Error("The iPad closed the SSH connection"));
    });
    client.connect({
      sock: socket,
      username,
      readyTimeout: handshakeTimeoutMs,
      keepaliveInterval: keepaliveIntervalMs,
      authHandler: (_methodsLeft, _partialSuccess, next) => {
        if (key && !keyOffered) {
          keyOffered = true;
          next({ type: "publickey", username, key });
        } else if (askPassword && passwordsAsked < passwordAttempts) {
          passwordsAsked += 1;
          askPassword(passwordsAsked > 1).then((password) => {
            if (password === null) {
              refuse();
            } else {
              next({ type: "password", username, password });
            }
          }, refuse);
        } else {
          refuse();
        }
      },
    });
  });
}

export async function readHostKey(): Promise<Buffer | null> {
  const socket = await openIpadPort(sshPort);
  if (!socket) {
    return null;
  }
  const client = new Client();
  return new Promise((resolve) => {
    let hostKey: Buffer | null = null;
    const finish = () => {
      resolve(hostKey);
    };
    client.on("error", finish);
    client.on("close", finish);
    client.connect({
      sock: socket,
      username,
      readyTimeout: handshakeTimeoutMs,
      hostVerifier: (key: Buffer) => {
        hostKey = key;
        return false;
      },
    });
  });
}

export function runForBytes(client: Client, command: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error("The iPad took too long to answer over SSH"));
    }, commandTimeoutMs);
    client.exec(command, (error, channel) => {
      if (error) {
        clearTimeout(timer);
        reject(error);
        return;
      }
      const output: Buffer[] = [];
      channel.on("data", (chunk: Buffer) => {
        output.push(chunk);
      });
      channel.stderr.resume();
      channel.on("close", (code: number | null) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve(Buffer.concat(output));
        } else {
          reject(
            new Error(`The command on the iPad ended with ${String(code)}`),
          );
        }
      });
    });
  });
}

export function runScript(
  client: Client,
  script: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error("The script on the iPad took too long"));
    }, timeoutMs);
    client.exec("bash -s", (error, channel) => {
      if (error) {
        clearTimeout(timer);
        reject(error);
        return;
      }
      const output: Buffer[] = [];
      channel.on("data", (chunk: Buffer) => {
        output.push(chunk);
      });
      channel.stderr.resume();
      channel.on("close", () => {
        clearTimeout(timer);
        resolve(Buffer.concat(output).toString());
      });
      channel.end(script);
    });
  });
}

export function quote(value: string): string {
  return `'${value.replaceAll("'", String.raw`'\''`)}'`;
}

export function upload(
  client: Client,
  file: string,
  contents: Buffer,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error("The copy to the iPad took too long"));
    }, timeoutMs);
    client.exec(`cat > ${quote(file)}`, (error, channel) => {
      if (error) {
        clearTimeout(timer);
        reject(error);
        return;
      }
      channel.resume();
      channel.stderr.resume();
      channel.on("close", (code: number | null) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`The copy to the iPad ended with ${String(code)}`));
        }
      });
      channel.end(contents);
    });
  });
}

export async function run(client: Client, command: string): Promise<string> {
  return (await runForBytes(client, command)).toString();
}

export async function runEach<Name extends string>(
  client: Client,
  commands: Record<Name, string>,
): Promise<Record<Name, string>> {
  const names = Object.keys(commands) as Name[];
  const script = names
    .map((name) => `printf '${recordSeparatorEscape}'; ${commands[name]}`)
    .concat("true")
    .join("; ");
  const outputs = (await run(client, script)).split(recordSeparator).slice(1);
  return Object.fromEntries(
    names.map((name, index) => [name, outputs[index] ?? ""]),
  ) as Record<Name, string>;
}
