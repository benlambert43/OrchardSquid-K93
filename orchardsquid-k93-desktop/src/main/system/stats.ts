import path from "node:path";

import type { Client } from "ssh2";

import type { IpadProcess, IpadStats } from "@/bridge.ts";
import { runEach } from "@/main/ssh.ts";

const volumes = [
  { name: "System", mount: "/" },
  { name: "Data", mount: "/private/var" },
];

const commands = {
  kernel: "uname -sr",
  clock: "date +%s",
  sysctl: "sysctl kern.boottime vm.loadavg hw.memsize",
  memory: "vm_stat",
  volumes: `df -k ${volumes.map(({ mount }) => mount).join(" ")}`,
  processes: "ps -A -o pid,rss,comm",
};

const kilobyte = 1024;
const topProcessCount = 5;

function text(output: string, pattern: RegExp): string {
  const value = pattern.exec(output)?.[1];
  if (value === undefined) {
    throw new Error(`The iPad's system report has no ${pattern.source}`);
  }
  return value;
}

function number(output: string, pattern: RegExp): number {
  return Number(text(output, pattern));
}

function parseProcesses(listing: string): IpadProcess[] {
  return Array.from(
    listing.matchAll(/^\s*(\d+)\s+(\d+)\s+(.+)$/gm),
    ([, pid, kilobytes, command = ""]) => ({
      pid: Number(pid),
      name: command.startsWith("/") ? path.posix.basename(command) : command,
      memoryBytes: Number(kilobytes) * kilobyte,
    }),
  );
}

export async function readStats(client: Client): Promise<IpadStats> {
  const outputs = await runEach(client, commands);
  const pageSize = number(outputs.memory, /page size of (\d+) bytes/);
  const availablePages =
    number(outputs.memory, /^Pages free:\s+(\d+)\./m) +
    number(outputs.memory, /^Pages inactive:\s+(\d+)\./m) +
    number(outputs.memory, /^Pages speculative:\s+(\d+)\./m);
  const memoryBytes = number(outputs.sysctl, /^hw\.memsize: (\d+)$/m);
  const processes = parseProcesses(outputs.processes);
  return {
    kernel: text(outputs.kernel, /^(.+)$/m),
    uptimeSeconds:
      number(outputs.clock, /^(\d+)$/m) -
      number(outputs.sysctl, /^kern\.boottime: \{ sec = (\d+)/m),
    loadAverages: text(outputs.sysctl, /^vm\.loadavg: \{ ([\d. ]+) \}$/m)
      .split(" ")
      .map(Number),
    memory: {
      usedBytes: memoryBytes - availablePages * pageSize,
      totalBytes: memoryBytes,
    },
    volumes: volumes.map(({ name, mount }) => {
      const [, used, available] =
        new RegExp(
          String.raw`^\S+\s+\d+\s+(\d+)\s+(\d+)\s+\d+%\s+${mount}$`,
          "m",
        ).exec(outputs.volumes) ?? [];
      if (used === undefined || available === undefined) {
        throw new Error(`The iPad's system report has no volume at ${mount}`);
      }
      return {
        name,
        usedBytes: Number(used) * kilobyte,
        totalBytes: (Number(used) + Number(available)) * kilobyte,
      };
    }),
    processes: processes.length,
    topProcesses: processes
      .toSorted((a, b) => b.memoryBytes - a.memoryBytes)
      .slice(0, topProcessCount),
  };
}
