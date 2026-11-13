import { parseOpenStep } from "plist";
import type { Client } from "ssh2";
import { z } from "zod";

import type { Ipad } from "@/bridge.ts";
import { runEach } from "@/main/ssh.ts";

const commands = {
  name: "scutil --get ComputerName",
  gestalt: "gssc",
  packet: "ipconfig getpacket en0",
};

const gestaltSchema = z.object({
  ProductType: z.string(),
  HWModelStr: z.string(),
  ProductVersion: z.string(),
  BuildVersion: z.string(),
});

export async function readIdentity(client: Client): Promise<Ipad> {
  const outputs = await runEach(client, commands);
  const gestalt = gestaltSchema.parse(parseOpenStep(outputs.gestalt));
  return {
    name: outputs.name.trim(),
    productType: gestalt.ProductType,
    hardwareModel: gestalt.HWModelStr,
    productVersion: gestalt.ProductVersion,
    buildVersion: gestalt.BuildVersion,
    wifiAddress: /^chaddr = (\S+)$/m.exec(outputs.packet)?.[1] ?? null,
    udid: null,
  };
}
