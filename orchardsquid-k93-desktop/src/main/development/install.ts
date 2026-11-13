import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { LaptopInstall } from "@/bridge.ts";
import {
  type DevelopmentStep,
  developmentTarget,
  firstInstallSteps,
  type LaptopToolName,
  theosSource,
} from "@/developmentSetup.ts";
import { exists } from "@/main/development/paths.ts";
import { lastLines, runProcess } from "@/main/development/process.ts";
import { adjustSdk, isSdkAdjusted } from "@/main/development/sdk.ts";
import { exclusively } from "@/main/development/tasks.ts";
import {
  type Announce,
  type ReportProgress,
  withProgress,
} from "@/main/development/progress.ts";
import { findTool, gitFile, theosFolder } from "@/main/development/tools.ts";

const tarFile = "/usr/bin/tar";
const quietTimeoutMs = 10 * 60 * 1000;
const requestTimeoutMs = 30 * 1000;
const downloadTimeoutMs = 10 * 60 * 1000;
const maxSdkBytes = 64 * 1024 * 1024;
const cloneShare = 0.25;
const checkoutShare = 0.1;
const sdkFolder = `${developmentTarget.sdk}.sdk`;
const sdkArchive = `${sdkFolder}.tar.xz`;
const sha256Prefix = "sha256:";

const releaseSchema = z.object({
  assets: z.array(
    z.object({
      name: z.string(),
      size: z.int().positive(),
      digest: z.string().nullish(),
      browser_download_url: z.string(),
    }),
  ),
});

type Asset = z.infer<typeof releaseSchema>["assets"][number];

type Installer = (announce: Announce) => Promise<LaptopInstall>;

function followClone(folder: string, announce: Announce) {
  let clones = 0;
  let registered = 0;
  let checkedOut = 0;
  let received = 0;
  let item: string | null = null;
  let furthest = 0;
  return (line: string) => {
    const cloning = /^Cloning into '(.+)'\.\.\.$/.exec(line)?.[1];
    const percent = /^Receiving objects:\s+(\d+)%/.exec(line)?.[1];
    if (cloning) {
      clones += 1;
      received = 0;
      item = clones === 1 ? null : path.relative(folder, cloning);
    } else if (percent) {
      received = Number(percent) / 100;
    } else if (/^Submodule '.+' \(.+\) registered for path /.test(line)) {
      registered += 1;
      received = 0;
    } else if (/^Submodule path '.+': checked out /.test(line)) {
      checkedOut += 1;
    } else {
      return;
    }
    const cloned =
      registered === 0 ? 0 : (Math.max(clones - 2, 0) + received) / registered;
    const fraction =
      registered === 0
        ? cloneShare * received
        : cloneShare +
          (1 - cloneShare - checkoutShare) * Math.min(cloned, 1) +
          checkoutShare * Math.min(checkedOut / registered, 1);
    furthest = Math.max(furthest, fraction);
    announce(registered === 0 ? "clone" : "submodules", item, furthest);
  };
}

const installTheos: Installer = async (announce) => {
  const folder = theosFolder();
  const entries = await readdir(folder).catch((): string[] => []);
  if (!entries.includes("makefiles")) {
    if (entries.length > 0) {
      return { state: "occupied" };
    }
    const staging = `${folder}.installing`;
    await rm(staging, { recursive: true, force: true });
    try {
      announce("clone", null, 0);
      const { code, output } = await runProcess(
        gitFile,
        ["clone", "--recursive", "--progress", theosSource.repository, staging],
        { quietTimeoutMs, onLine: followClone(staging, announce) },
      );
      if (code !== 0 || !(await exists(path.join(staging, "makefiles")))) {
        return { state: "failed", output: lastLines(output) };
      }
      await rename(staging, folder);
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }
  return { state: "installed" };
};

async function findSdkArchive(): Promise<Asset | null> {
  try {
    const response = await fetch(theosSource.sdkRelease, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    if (!response.ok) {
      console.error(
        `${theosSource.sdkRelease} answered ${String(response.status)}`,
      );
      return null;
    }
    const { assets } = releaseSchema.parse(await response.json());
    return (
      assets.find(
        ({ name, size, browser_download_url: url }) =>
          name === sdkArchive &&
          size <= maxSdkBytes &&
          url.startsWith(theosSource.sdkDownloads),
      ) ?? null
    );
  } catch (error) {
    console.error("The SDK release could not be read", error);
    return null;
  }
}

async function download(
  { browser_download_url: url, size }: Asset,
  announce: Announce,
): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(downloadTimeoutMs),
    });
    if (!response.ok || !response.body) {
      console.error(`${url} answered ${String(response.status)}`);
      return null;
    }
    const chunks: Uint8Array[] = [];
    let received = 0;
    for await (const chunk of response.body) {
      if (!(chunk instanceof Uint8Array)) {
        return null;
      }
      chunks.push(chunk);
      received += chunk.length;
      if (received > size) {
        break;
      }
      announce("download", null, received / size);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error(`${url} could not be downloaded`, error);
    return null;
  }
}

function matches(file: Buffer, { size, digest }: Asset): boolean {
  return (
    file.length === size &&
    (!digest?.startsWith(sha256Prefix) ||
      createHash("sha256").update(file).digest("hex") ===
        digest.slice(sha256Prefix.length).toLowerCase())
  );
}

const installSdk: Installer = async (announce) => {
  const theos = theosFolder();
  const sdks = path.join(theos, "sdks");
  const target = path.join(sdks, sdkFolder);
  if (await exists(target)) {
    if (!(await isSdkAdjusted(target))) {
      await adjustSdk(target, announce);
    }
    return { state: "installed" };
  }
  if (!(await exists(path.join(theos, "makefiles")))) {
    return { state: "failed", output: "Theos is not installed." };
  }
  const asset = await findSdkArchive();
  if (!asset) {
    return { state: "unavailable" };
  }
  announce("download", null, 0);
  const archive = await download(asset, announce);
  if (!archive) {
    return { state: "unavailable" };
  }
  if (!matches(archive, asset)) {
    return { state: "mismatch" };
  }
  announce("unpack");
  await mkdir(sdks, { recursive: true });
  const staging = await mkdtemp(path.join(sdks, ".installing-"));
  try {
    const { code, output } = await runProcess(
      tarFile,
      ["-x", "-f", "-", "-C", staging],
      { quietTimeoutMs, input: archive },
    );
    const unpacked = path.join(staging, sdkFolder);
    if (code !== 0 || !(await exists(unpacked))) {
      return { state: "failed", output: lastLines(output) };
    }
    await adjustSdk(unpacked, announce);
    await rename(unpacked, target);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return { state: "installed" };
};

function installFormula(name: string): Installer {
  return async (announce) => {
    const brew = await findTool("brew");
    if (!brew) {
      return { state: "failed", output: "Homebrew is not installed." };
    }
    const { code, output } = await runProcess(brew, ["install", name], {
      quietTimeoutMs,
      onLine: (line) => {
        const stage = /^==> (.+)$/.exec(line)?.[1];
        if (stage) {
          announce("homebrew", stage);
        }
      },
    });
    return code === 0 && (await findTool(name))
      ? { state: "installed" }
      : { state: "failed", output: lastLines(output) };
  };
}

const installers: Record<LaptopToolName, Installer> = {
  theos: installTheos,
  sdk: installSdk,
  ldid: installFormula("ldid"),
  xz: installFormula("xz"),
};

async function findFirstStep(tool: LaptopToolName): Promise<DevelopmentStep> {
  const sdk = path.join(theosFolder(), "sdks", sdkFolder);
  return tool === "sdk" && (await exists(sdk))
    ? "adjust"
    : firstInstallSteps[tool];
}

export function installLaptopTool(
  tool: LaptopToolName,
  report: ReportProgress,
): Promise<LaptopInstall> {
  return exclusively(async () => {
    try {
      return await withProgress(
        tool,
        await findFirstStep(tool),
        report,
        (announce) => installers[tool](announce),
      );
    } catch (error) {
      console.error(`${tool} could not be installed`, error);
      return {
        state: "failed",
        output: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
