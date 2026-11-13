import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { gunzipSync } from "node:zlib";

import type { Client } from "ssh2";
import { z } from "zod";

import type { IpadBatteryHealth } from "@/bridge.ts";
import { runForBytes } from "@/main/ssh.ts";

const powerLog =
  "/private/var/containers/Shared/SystemGroup/*/Library/BatteryLife/CurrentPowerlog.PLSQL";
const writeAheadSuffix = "-wal";
const largestLogBytes = 256 * 1024 ** 2;

const latestSample = `
  SELECT CycleCount AS cycleCount,
         AppleRawMaxCapacity AS maxCapacityMah,
         DesignCapacity AS designCapacityMah
  FROM PLBatteryAgent_EventBackward_Battery
  WHERE CycleCount IS NOT NULL
    AND AppleRawMaxCapacity IS NOT NULL
    AND DesignCapacity IS NOT NULL
  ORDER BY ID DESC
  LIMIT 1
`;

const sampleSchema = z.object({
  cycleCount: z.int().nonnegative(),
  maxCapacityMah: z.int().positive(),
  designCapacityMah: z.int().positive(),
});

async function copy(client: Client, file: string): Promise<Buffer | null> {
  const compressed = await runForBytes(
    client,
    `[ -e ${file} ] || exit 0; gzip -1 -c ${file}`,
  );
  return compressed.length > 0
    ? gunzipSync(compressed, { maxOutputLength: largestLogBytes })
    : null;
}

async function queryLatestSample(
  database: Buffer,
  writeAheadLog: Buffer,
): Promise<unknown> {
  const folder = await mkdtemp(path.join(os.tmpdir(), "orchardsquid-k93-"));
  try {
    const file = path.join(folder, "powerlog.sqlite");
    await Promise.all([
      writeFile(file, database),
      writeFile(`${file}${writeAheadSuffix}`, writeAheadLog),
    ]);
    const connection = new DatabaseSync(file);
    try {
      return connection.prepare(latestSample).get();
    } finally {
      connection.close();
    }
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

export async function readBatteryHealth(
  client: Client,
): Promise<IpadBatteryHealth | null> {
  const [database, writeAheadLog] = await Promise.all([
    copy(client, powerLog),
    copy(client, `${powerLog}${writeAheadSuffix}`),
  ]);
  if (!database) {
    return null;
  }
  const sample = await queryLatestSample(
    database,
    writeAheadLog ?? Buffer.alloc(0),
  );
  return sample === undefined ? null : sampleSchema.parse(sample);
}
