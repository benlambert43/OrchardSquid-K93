import { readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type {
  LaptopTool,
  LaptopToolchain,
  SdkTool,
  TheosTool,
  XcodeTool,
} from "@/bridge.ts";
import { developmentTarget } from "@/developmentSetup.ts";
import { exists, shortenHome } from "@/main/development/paths.ts";
import { readShellSetting } from "@/main/development/shellProfile.ts";
import {
  findTheosFolder,
  findTool,
  gitFile,
  output,
  standardOutput,
} from "@/main/development/tools.ts";
import { readPlist } from "@/main/plist.ts";

const sdkExtension = ".sdk";
const sdkLibrary = "usr/lib/libSystem.B.tbd";

const sdkSettingsSchema = z.object({ Version: z.string() });

async function readXcode(): Promise<XcodeTool | null> {
  const folder = (await output("/usr/bin/xcode-select", ["-p"]))?.trim();
  if (!folder) {
    return null;
  }
  const [version, compiler, linker] = await Promise.all([
    output("/usr/bin/xcodebuild", ["-version"]),
    output("/usr/bin/xcrun", ["clang", "--version"]),
    output("/usr/bin/xcrun", ["ld", "-v"]),
  ]);
  const clang = compiler?.match(/^Apple clang version (\S+)/m)?.[1];
  return {
    folder,
    full: folder.includes(".app/"),
    version: version?.match(/^Xcode (\S+)/m)?.[1] ?? null,
    build: version?.match(/^Build version (\S+)/m)?.[1] ?? null,
    compiler: clang ? `Apple clang ${clang}` : null,
    linker: linker?.match(/PROJECT:(\S+)/)?.[1] ?? null,
    armv7: /support archs:.*\barmv7\b/.test(linker ?? ""),
  };
}

async function readHomebrew(): Promise<LaptopTool | null> {
  const file = await findTool("brew");
  if (!file) {
    return null;
  }
  const version = await output(file, ["--version"]);
  return { file, version: version?.match(/^Homebrew (\S+)/m)?.[1] ?? null };
}

async function readFormula(name: string): Promise<LaptopTool | null> {
  const file = await findTool(name);
  if (!file) {
    return null;
  }
  const target = await realpath(file).catch(() => file);
  return {
    file,
    version: /\/Cellar\/[^/]+\/([^/]+)\//.exec(target)?.[1] ?? null,
  };
}

async function listSdks(theos: string): Promise<string[]> {
  const entries = await readdir(path.join(theos, "sdks")).catch(
    (): string[] => [],
  );
  return entries
    .filter((entry) => entry.endsWith(sdkExtension))
    .map((entry) => entry.slice(0, -sdkExtension.length))
    .toSorted((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function readTheos(folder: string): Promise<TheosTool> {
  const shell = await readShellSetting();
  const entries = await readdir(folder).catch((): string[] => []);
  if (!entries.includes("makefiles")) {
    return {
      folder: shortenHome(folder),
      state: entries.length === 0 ? "absent" : "occupied",
      version: null,
      commit: null,
      committedAt: null,
      branch: null,
      source: null,
      sdks: [],
      shell,
    };
  }
  const git = (...args: string[]) =>
    standardOutput(gitFile, ["-C", folder, ...args]);
  const [version, latest, branch, source, sdks] = await Promise.all([
    git("describe", "--tags", "--always"),
    git("log", "-1", "--format=%h %cI"),
    git("rev-parse", "--abbrev-ref", "HEAD"),
    git("remote", "get-url", "origin"),
    listSdks(folder),
  ]);
  const [commit, committedAt] = latest?.split(" ") ?? [];
  return {
    folder: shortenHome(folder),
    state: "installed",
    version,
    commit: commit ?? null,
    committedAt: committedAt ?? null,
    branch,
    source,
    sdks,
    shell,
  };
}

async function readSdk(theos: string): Promise<SdkTool | null> {
  const folder = path.join(
    theos,
    "sdks",
    `${developmentTarget.sdk}${sdkExtension}`,
  );
  if (!(await exists(folder))) {
    return null;
  }
  const settings = await readFile(path.join(folder, "SDKSettings.plist"))
    .then((file) => sdkSettingsSchema.parse(readPlist(file)))
    .catch(() => null);
  const library = await readFile(path.join(folder, sdkLibrary), "utf8").catch(
    () => "",
  );
  const architectures = /^archs:\s*\[([^\]]*)\]/m.exec(library)?.[1] ?? "";
  return {
    folder: shortenHome(folder),
    version: settings?.Version ?? null,
    architectures: architectures
      .split(",")
      .map((architecture) => architecture.trim())
      .filter((architecture) => architecture.startsWith("arm")),
  };
}

export async function readLaptopToolchain(): Promise<LaptopToolchain> {
  const folder = await findTheosFolder();
  const [xcode, homebrew, theos, sdk, ldid, xz] = await Promise.all([
    readXcode(),
    readHomebrew(),
    readTheos(folder),
    readSdk(folder),
    readFormula("ldid"),
    readFormula("xz"),
  ]);
  return { xcode, homebrew, theos, sdk, ldid, xz };
}
