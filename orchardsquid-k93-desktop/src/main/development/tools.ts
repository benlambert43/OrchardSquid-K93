import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { exists } from "@/main/development/paths.ts";

const run = promisify(execFile);

export const gitFile = "/usr/bin/git";

const appFolder = ".orchardsquid-k93";
const homebrewFolders = ["/opt/homebrew/bin", "/usr/local/bin"];
const systemPath = "/usr/bin:/bin:/usr/sbin:/sbin";
const checkTimeoutMs = 10_000;

async function outputs(
  file: string,
  args: string[],
): Promise<{ stdout: string; stderr: string } | null> {
  try {
    return await run(file, args, { timeout: checkTimeoutMs });
  } catch {
    return null;
  }
}

export async function output(
  file: string,
  args: string[],
): Promise<string | null> {
  const result = await outputs(file, args);
  return result && `${result.stdout}${result.stderr}`;
}

export async function standardOutput(
  file: string,
  args: string[],
): Promise<string | null> {
  return ((await outputs(file, args))?.stdout ?? "").trim() || null;
}

export async function findTool(name: string): Promise<string | null> {
  for (const folder of homebrewFolders) {
    const file = path.join(folder, name);
    if (await exists(file)) {
      return file;
    }
  }
  return null;
}

export function toolEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: [...homebrewFolders, process.env.PATH ?? systemPath].join(":"),
    GIT_TERMINAL_PROMPT: "0",
    HOMEBREW_NO_COLOR: "1",
    HOMEBREW_NO_EMOJI: "1",
    HOMEBREW_NO_ENV_HINTS: "1",
  };
}

export function theosFolder(): string {
  return path.join(os.homedir(), appFolder, "theos");
}

export function moduleCacheFolder(): string {
  return path.join(os.homedir(), appFolder, "cache", "clang-modules");
}
