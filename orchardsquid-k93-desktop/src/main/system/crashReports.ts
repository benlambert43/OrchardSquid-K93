import type { Client } from "ssh2";
import { z } from "zod";

import type { IpadCrashReports } from "@/bridge.ts";
import { runEach } from "@/main/ssh.ts";

const folder = "/var/mobile/Library/Logs/CrashReporter";
const retiredFolder = `${folder}/Retired`;
const commands = {
  headers: `grep -m1 -h '"bug_type"' ${folder}/*.ips* ${retiredFolder}/*.ips*`,
};
const crashType = "109";
const memoryEventType = "298";

const headerSchema = z.object({
  bug_type: z.string(),
  timestamp: z.string(),
  name: z.string().optional(),
});

interface Report {
  type: string;
  process: string | null;
  time: number;
}

function toTime(timestamp: string): number {
  return Date.parse(
    timestamp.replace(/^(\S+) ([\d:]+)\.\d+ ([+-]\d{2})(\d{2})$/, "$1T$2$3:$4"),
  );
}

function readReport(line: string): Report[] {
  try {
    const header = headerSchema.parse(JSON.parse(line));
    const time = toTime(header.timestamp);
    return Number.isNaN(time)
      ? []
      : [{ type: header.bug_type, process: header.name ?? null, time }];
  } catch {
    return [];
  }
}

function latest(reports: Report[]): Report | null {
  return reports.toSorted((a, b) => b.time - a.time)[0] ?? null;
}

export async function readCrashReports(
  client: Client,
): Promise<IpadCrashReports> {
  const { headers } = await runEach(client, commands);
  const reports = headers.split("\n").flatMap(readReport);
  const crashes = reports.filter(({ type }) => type === crashType);
  const memoryEvents = reports.filter(({ type }) => type === memoryEventType);
  const latestCrash = latest(crashes);
  return {
    crashes: crashes.length,
    latestCrash: latestCrash && {
      process: latestCrash.process,
      time: latestCrash.time,
    },
    memoryEvents: memoryEvents.length,
    latestMemoryEvent: latest(memoryEvents)?.time ?? null,
  };
}
