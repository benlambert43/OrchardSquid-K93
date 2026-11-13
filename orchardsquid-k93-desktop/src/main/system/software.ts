import { parse } from "plist";
import type { Client } from "ssh2";
import { z } from "zod";

import type { IpadSoftware } from "@/bridge.ts";
import { runEach } from "@/main/ssh.ts";

function encode(file: string): string {
  return `openssl base64 -A < ${file}`;
}

const commands = {
  carbon: "cat /.installed_carbon",
  iocaste: "ls -d /var/root/iocaste",
  packages: "dpkg-query -W -f '${Package} ${Version}\\n'",
  safari: encode("/Applications/MobileSafari.app/Info.plist"),
  webkit: encode("/System/Library/Frameworks/WebKit.framework/Info.plist"),
};

const bundleSchema = z.object({
  CFBundleShortVersionString: z.string(),
  CFBundleVersion: z.string(),
});

function readBundle(encoded: string): z.infer<typeof bundleSchema> | null {
  return encoded.trim()
    ? bundleSchema.parse(parse(Buffer.from(encoded, "base64")))
    : null;
}

function withoutSystemPrefix(version: string): string {
  return version.replace(/^\d+(?=\d{3}\.)/, "");
}

function parsePackages(listing: string): Map<string, string> {
  return new Map(
    Array.from(
      listing.matchAll(/^(\S+) (\S+)$/gm),
      ([, name = "", version = ""]): [string, string] => [name, version],
    ),
  );
}

export async function readSoftware(client: Client): Promise<IpadSoftware> {
  const outputs = await runEach(client, commands);
  const packages = parsePackages(outputs.packages);
  const webkit = readBundle(outputs.webkit);
  return {
    carbon: outputs.carbon.trim() || null,
    iocaste: outputs.iocaste.trim() !== "",
    cydia: packages.get("cydia") ?? null,
    openssh: packages.get("openssh") ?? null,
    openssl: packages.get("openssl") ?? null,
    safari: readBundle(outputs.safari)?.CFBundleShortVersionString ?? null,
    webkit: webkit && withoutSystemPrefix(webkit.CFBundleVersion),
    packages: packages.size,
  };
}
