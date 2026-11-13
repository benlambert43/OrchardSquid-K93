import { createHash } from "node:crypto";

import type { Client } from "ssh2";
import { z } from "zod";

import type { ZebraInstall } from "@/bridge.ts";
import { developerPackages, developerSources } from "@/developerSetup.ts";
import { quote, run, runScript, upload } from "@/main/ssh.ts";
import { newer } from "@/main/system/developerSetup.ts";

const repository = developerSources.zebra.url;
const packageFile = "/private/var/tmp/xyz.willy.zebra.deb";
const downloadTimeoutMs = 2 * 60 * 1000;
const copyTimeoutMs = 2 * 60 * 1000;
const installTimeoutMs = 5 * 60 * 1000;
const reportedLines = 12;
const statusLabel = "dpkg-status";
const homeScreenFailure = "uicache-failed";

const script = String.raw`
f=${quote(packageFile)}
dpkg -i "$f" </dev/null 2>&1
status=$?
rm -f "$f"
if [ "$status" = 0 ]; then
  (cd / && su mobile -c uicache) </dev/null >/dev/null 2>&1 || echo ${homeScreenFailure}
fi
echo "${statusLabel} $status"
`;

const listingSchema = z.object({
  Version: z.string().min(1),
  Filename: z.string().min(1),
  Size: z.coerce.number().int().positive(),
  SHA256: z
    .string()
    .toLowerCase()
    .regex(/^[0-9a-f]{64}$/),
});

type Listing = z.infer<typeof listingSchema>;

function parseListings(index: string, architecture: string): Listing[] {
  return index.split(/\n\s*\n/).flatMap((stanza) => {
    const fields = new Map(
      [...stanza.matchAll(/^([\w-]+): (.*)$/gm)].map(
        ([, name = "", value = ""]) => [name, value.trim()] as const,
      ),
    );
    if (
      fields.get("Package") !== developerPackages.zebra ||
      fields.get("Architecture") !== architecture
    ) {
      return [];
    }
    const listing = listingSchema.safeParse(Object.fromEntries(fields));
    return listing.success ? [listing.data] : [];
  });
}

function newest(listings: Listing[]): Listing | null {
  let best: Listing | null = null;
  for (const listing of listings) {
    if (!best || newer(listing.Version, best.Version)) {
      best = listing;
    }
  }
  return best;
}

async function download(url: URL): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(downloadTimeoutMs),
    });
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
    console.error(`${url.href} answered ${String(response.status)}`);
  } catch (error) {
    console.error(`${url.href} could not be downloaded`, error);
  }
  return null;
}

function matches(file: Buffer, { Size, SHA256 }: Listing): boolean {
  return (
    file.length === Size &&
    createHash("sha256").update(file).digest("hex") === SHA256
  );
}

function describeFailure(output: string): string {
  return output
    .split("\n")
    .filter(
      (line) =>
        line.trim() &&
        !line.startsWith(statusLabel) &&
        line !== homeScreenFailure,
    )
    .slice(-reportedLines)
    .join("\n");
}

export async function installZebra(client: Client): Promise<ZebraInstall> {
  const architecture = (await run(client, "dpkg --print-architecture")).trim();
  const index = await download(new URL("Packages", repository));
  const listing =
    index && newest(parseListings(index.toString(), architecture));
  if (!listing) {
    return { state: "unavailable" };
  }
  const url = new URL(listing.Filename, repository);
  const file = url.href.startsWith(repository) ? await download(url) : null;
  if (!file) {
    return { state: "unavailable" };
  }
  if (!matches(file, listing)) {
    return { state: "mismatch" };
  }
  await upload(client, packageFile, file, copyTimeoutMs);
  const output = await runScript(client, script, installTimeoutMs);
  if (!output.split("\n").includes(`${statusLabel} 0`)) {
    return { state: "refused", output: describeFailure(output) };
  }
  return {
    state: "installed",
    version: listing.Version,
    homeScreenRefreshed: !output.split("\n").includes(homeScreenFailure),
  };
}
