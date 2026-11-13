import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type { LaptopToolchain } from "@/bridge.ts";
import { developmentTarget } from "@/developmentSetup.ts";

const run = promisify(execFile);

const homebrewFolders = ["/opt/homebrew/bin", "/usr/local/bin"];

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function output(file: string, args: string[]): Promise<string | null> {
  try {
    const { stdout, stderr } = await run(file, args, { timeout: 10_000 });
    return `${stdout}${stderr}`;
  } catch {
    return null;
  }
}

async function findTool(name: string): Promise<string | null> {
  for (const folder of homebrewFolders) {
    const file = path.join(folder, name);
    if (await exists(file)) {
      return file;
    }
  }
  return null;
}

async function readXcode(): Promise<LaptopToolchain["xcode"]> {
  const folder = (await output("/usr/bin/xcode-select", ["-p"]))?.trim();
  if (!folder) {
    return null;
  }
  const version = await output("/usr/bin/xcodebuild", ["-version"]);
  return {
    folder,
    version: version?.match(/^Xcode (\S+)/m)?.[1] ?? null,
  };
}

async function readArmv7Linker(): Promise<boolean> {
  const version = await output("/usr/bin/xcrun", ["ld", "-v"]);
  return /support archs:.*\barmv7\b/.test(version ?? "");
}

function theosFolder(): string {
  return process.env.THEOS ?? path.join(os.homedir(), "theos");
}

export async function readLaptopToolchain(): Promise<LaptopToolchain> {
  const theos = theosFolder();
  const [xcode, armv7Linker, homebrew, ldid, iproxy, hasTheos, hasSdk] =
    await Promise.all([
      readXcode(),
      readArmv7Linker(),
      findTool("brew"),
      findTool("ldid"),
      findTool("iproxy"),
      exists(path.join(theos, "makefiles")),
      exists(path.join(theos, "sdks", `${developmentTarget.sdk}.sdk`)),
    ]);
  return {
    xcode,
    armv7Linker,
    homebrew,
    ldid,
    iproxy,
    theos: { folder: theos.replace(os.homedir(), "~"), installed: hasTheos },
    sdk: hasSdk,
  };
}
