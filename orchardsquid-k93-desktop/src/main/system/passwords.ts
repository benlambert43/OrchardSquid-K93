import type { Client } from "ssh2";

import { run } from "@/main/ssh.ts";

const factoryPasswordHash = "/smx7MYTQIi2M";

const command = `grep -E '^(root|mobile):${factoryPasswordHash}:' /etc/master.passwd | sed 's/:.*//'`;

export async function readDefaultPasswordAccounts(
  client: Client,
): Promise<string[]> {
  return (await run(client, command))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
