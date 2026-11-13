import { parseOpenStep } from "plist";
import type { Client } from "ssh2";
import { z } from "zod";

import type { IpadBattery } from "@/bridge.ts";
import { run } from "@/main/ssh.ts";

const command = "gssc";
const percent = 100;

const flagSchema = z.enum(["0", "1"]).transform((flag) => flag === "1");

const answersSchema = z.object({
  BatteryCurrentCapacity: z.coerce.number().min(0).max(percent),
  BatteryIsCharging: flagSchema,
  BatteryIsFullyCharged: flagSchema,
  ExternalPowerSourceConnected: flagSchema,
});

function readState(
  answers: z.infer<typeof answersSchema>,
): IpadBattery["state"] {
  if (answers.BatteryIsFullyCharged) {
    return "full";
  }
  if (answers.BatteryIsCharging) {
    return "charging";
  }
  return answers.ExternalPowerSourceConnected ? "not-charging" : "discharging";
}

export async function readBattery(client: Client): Promise<IpadBattery> {
  const answers = answersSchema.parse(
    parseOpenStep(await run(client, command)),
  );
  return {
    level: answers.BatteryCurrentCapacity / percent,
    state: readState(answers),
  };
}
