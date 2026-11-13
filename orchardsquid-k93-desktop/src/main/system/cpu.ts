import type { Client } from "ssh2";

import type { IpadCpu } from "@/bridge.ts";
import { run } from "@/main/ssh.ts";

const sampleSeconds = 1;
const command = `iostat -n 0 -c 2 -w ${String(sampleSeconds)}`;
const percent = 100;

export async function readCpu(client: Client): Promise<IpadCpu> {
  const sample = (await run(client, command)).trimEnd().split("\n").at(-1);
  const [, user, system] = /^\s*(\d+)\s+(\d+)\s+\d+\s/.exec(sample ?? "") ?? [];
  if (user === undefined || system === undefined) {
    throw new Error("The iPad's CPU sample could not be read");
  }
  return {
    userFraction: Number(user) / percent,
    systemFraction: Number(system) / percent,
  };
}
