import { parse } from "plist";
import type { Client } from "ssh2";
import { z } from "zod";

import type { IpadPackage, IpadSoftware } from "@/bridge.ts";
import { runEach } from "@/main/ssh.ts";
import { readDeveloperSetup } from "@/main/system/developerSetup.ts";

const packageFields = [
  "Package",
  "Version",
  "Section",
  "Installed-Size",
  "Status",
  "Tag",
  "binary:Summary",
];
const packageFormat = packageFields.map((field) => `\${${field}}`).join("\\t");
const installedStatus = "install ok installed";
const generatedTag = "role::cydia";
const kilobyte = 1024;

function encode(file: string): string {
  return `openssl base64 -A < ${file}`;
}

const commands = {
  carbon: "cat /.installed_carbon",
  iocaste: "ls -d /var/root/iocaste",
  packages: `dpkg-query -W -f '${packageFormat}\\n'`,
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

interface Entry {
  listing: IpadPackage;
  generated: boolean;
}

function parseEntry(line: string): Entry[] {
  const [
    id = "",
    version = "",
    section = "",
    size = "",
    status = "",
    tags = "",
    ...summary
  ] = line.split("\t");
  if (!id || !version || status !== installedStatus) {
    return [];
  }
  const kilobytes = Number.parseInt(size, 10);
  return [
    {
      listing: {
        id,
        version,
        section,
        summary: summary.join("\t"),
        installedBytes: Number.isNaN(kilobytes) ? null : kilobytes * kilobyte,
      },
      generated: tags.split(", ").includes(generatedTag),
    },
  ];
}

export async function readSoftware(client: Client): Promise<IpadSoftware> {
  const outputs = await runEach(client, commands);
  const entries = outputs.packages.split("\n").flatMap(parseEntry);
  const packages = entries
    .filter(({ generated }) => !generated)
    .map(({ listing }) => listing);
  const versions = new Map(packages.map(({ id, version }) => [id, version]));
  const webkit = readBundle(outputs.webkit);
  const developerSetup = await readDeveloperSetup(client);
  return {
    carbon: outputs.carbon.trim() || null,
    iocaste: outputs.iocaste.trim() !== "",
    cydia: versions.get("cydia") ?? null,
    openssh: versions.get("openssh") ?? null,
    openssl: versions.get("openssl") ?? null,
    safari: readBundle(outputs.safari)?.CFBundleShortVersionString ?? null,
    webkit: webkit && withoutSystemPrefix(webkit.CFBundleVersion),
    packages,
    generatedPackages: entries.length - packages.length,
    developerSetup,
  };
}
