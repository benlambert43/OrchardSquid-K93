import type { Client, ClientChannel } from "ssh2";

import type { ShellStatus, TerminalSize } from "@/bridge.ts";
import { send } from "@/main/events.ts";
import { readConnection } from "@/main/connection.ts";
import { connectSsh, SignInRefusedError } from "@/main/ssh.ts";

const terminalType = "xterm-256color";
const backlogLimitBytes = 1024 * 1024;

let status: ShellStatus = { state: "closed", reason: "" };
let size: TerminalSize = { cols: 80, rows: 24 };
let channel: ClientChannel | null = null;
let backlog: Buffer[] = [];
let backlogBytes = 0;
let answerPassword: ((password: string | null) => void) | null = null;

function setStatus(next: ShellStatus): void {
  status = next;
  send("shellStatus", next);
}

function record(chunk: Buffer): void {
  backlog.push(chunk);
  backlogBytes += chunk.length;
  let [oldest] = backlog;
  while (oldest && backlogBytes - oldest.length >= backlogLimitBytes) {
    backlogBytes -= oldest.length;
    backlog.shift();
    [oldest] = backlog;
  }
  send("shellOutput", chunk);
}

function askPassword(retry: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    answerPassword = resolve;
    setStatus({ state: "password", retry });
  });
}

function requestShell(client: Client): Promise<ClientChannel> {
  return new Promise((resolve, reject) => {
    client.shell({ term: terminalType, ...size }, (error, stream) => {
      if (error) {
        reject(error);
      } else {
        resolve(stream);
      }
    });
  });
}

function describe(error: unknown): string {
  if (error instanceof SignInRefusedError) {
    return "The iPad did not accept the sign-in.";
  }
  return error instanceof Error ? error.message : String(error);
}

async function start(): Promise<void> {
  backlog = [];
  backlogBytes = 0;
  send("shellReplay", new Uint8Array());
  setStatus({ state: "connecting" });
  try {
    const connection = readConnection();
    const client = await connectSsh(askPassword, connection);
    const stream = await requestShell(client);
    let exited = false;
    const finish = (reason: string) => {
      if (channel === stream) {
        channel = null;
        client.end();
        setStatus({ state: "closed", reason });
      }
    };
    channel = stream;
    stream.on("data", record);
    stream.stderr.on("data", record);
    stream.on("exit", () => {
      exited = true;
    });
    stream.on("error", (error: Error) => {
      finish(error.message);
    });
    stream.on("close", () => {
      finish(
        exited ? "The shell exited." : "The connection to the iPad was lost.",
      );
    });
    client.on("close", () => {
      finish("The connection to the iPad was lost.");
    });
    setStatus({ state: "open", transport: connection.transport });
  } catch (error) {
    setStatus({ state: "closed", reason: describe(error) });
  } finally {
    answerPassword = null;
  }
}

export function openShell(newSize: TerminalSize): void {
  size = newSize;
  if (status.state === "closed") {
    void start();
    return;
  }
  channel?.setWindow(size.rows, size.cols, 0, 0);
  send("shellReplay", Buffer.concat(backlog));
  send("shellStatus", status);
}

export function writeShell(input: string): void {
  channel?.write(input);
}

export function resizeShell(newSize: TerminalSize): void {
  size = newSize;
  channel?.setWindow(size.rows, size.cols, 0, 0);
}

export function submitShellPassword(password: string): void {
  const answer = answerPassword;
  if (answer) {
    answerPassword = null;
    setStatus({ state: "connecting" });
    answer(password);
  }
}
