import type { IpadSystem, IpadSystemReport } from "@/bridge.ts";
import {
  connectSsh,
  IpadUnpluggedError,
  run,
  SignInRefusedError,
} from "@/main/ssh.ts";

const volumes = [
  { name: "System", mount: "/" },
  { name: "Data", mount: "/private/var" },
];

const command = [
  `printf 'kernel=%s\\n' "$(uname -sr)"`,
  "date +now=%s",
  "sysctl kern.boottime vm.loadavg hw.memsize",
  "vm_stat",
  `df -k ${volumes.map(({ mount }) => mount).join(" ")}`,
  `printf 'processes=%s\\n' "$(ps -A | sed -n '$=')"`,
  `printf 'packages=%s\\n' "$(dpkg-query -W | sed -n '$=')"`,
].join("; ");

const kilobyte = 1024;

function text(report: string, pattern: RegExp): string {
  const value = pattern.exec(report)?.[1];
  if (value === undefined) {
    throw new Error(`The iPad's system report has no ${pattern.source}`);
  }
  return value;
}

function number(report: string, pattern: RegExp): number {
  return Number(text(report, pattern));
}

function parse(report: string): IpadSystem {
  const pageSize = number(report, /page size of (\d+) bytes/);
  const availablePages =
    number(report, /^Pages free:\s+(\d+)\./m) +
    number(report, /^Pages inactive:\s+(\d+)\./m) +
    number(report, /^Pages speculative:\s+(\d+)\./m);
  const memoryBytes = number(report, /^hw\.memsize: (\d+)$/m);
  return {
    kernel: text(report, /^kernel=(.+)$/m),
    uptimeSeconds:
      number(report, /^now=(\d+)$/m) -
      number(report, /^kern\.boottime: \{ sec = (\d+)/m),
    loadAverage: number(report, /^vm\.loadavg: \{ ([\d.]+) /m),
    memory: {
      usedBytes: memoryBytes - availablePages * pageSize,
      totalBytes: memoryBytes,
    },
    volumes: volumes.map(({ name, mount }) => {
      const [, used, available] =
        new RegExp(
          String.raw`^\S+\s+\d+\s+(\d+)\s+(\d+)\s+\d+%\s+${mount}$`,
          "m",
        ).exec(report) ?? [];
      if (used === undefined || available === undefined) {
        throw new Error(`The iPad's system report has no volume at ${mount}`);
      }
      return {
        name,
        usedBytes: Number(used) * kilobyte,
        totalBytes: (Number(used) + Number(available)) * kilobyte,
      };
    }),
    processes: number(report, /^processes=(\d+)$/m) - 1,
    packages: number(report, /^packages=(\d+)$/m),
  };
}

export async function readIpadSystem(): Promise<IpadSystemReport> {
  try {
    const client = await connectSsh();
    try {
      return { state: "ok", system: parse(await run(client, command)) };
    } finally {
      client.end();
    }
  } catch (error) {
    if (error instanceof IpadUnpluggedError) {
      return { state: "unplugged" };
    }
    if (error instanceof SignInRefusedError) {
      return { state: "signed-out" };
    }
    throw error;
  }
}
