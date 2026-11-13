import { appendFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ShellSetting } from "@/bridge.ts";
import { exists, shortenHome } from "@/main/development/paths.ts";
import { lineBreakAfter, readText } from "@/main/sshFiles.ts";

const setting = /^[ \t]*export[ \t]+THEOS=["']?([^"'\s#]+)/gm;
const plainPath = /^[\w~./-]+$/;

const bashProfiles = [".bashrc", ".bash_profile", ".profile"];

const profiles: Partial<Record<string, string[]>> = {
  zsh: [".zshenv", ".zprofile", ".zshrc"],
  bash: bashProfiles,
  sh: bashProfiles,
  dash: bashProfiles,
};

function profileFiles(): string[] {
  const shell = path.basename(os.userInfo().shell ?? "");
  const folder =
    shell === "zsh" ? (process.env.ZDOTDIR ?? os.homedir()) : os.homedir();
  return (profiles[shell] ?? []).map((name) => path.join(folder, name));
}

async function chooseProfile(files: string[]): Promise<string | null> {
  for (const file of files.slice(0, -1)) {
    if (await exists(file)) {
      return file;
    }
  }
  return files.at(-1) ?? null;
}

export async function readShellSetting(): Promise<ShellSetting> {
  const files = profileFiles();
  let found: ShellSetting | null = null;
  for (const file of files) {
    const value = [...((await readText(file)) ?? "").matchAll(setting)].at(
      -1,
    )?.[1];
    if (value) {
      found = { file: shortenHome(file), value };
    }
  }
  if (found) {
    return found;
  }
  const profile = await chooseProfile(files);
  return { file: profile && shortenHome(profile), value: null };
}

export async function writeShellSetting(folder: string): Promise<boolean> {
  const { value } = await readShellSetting();
  const profile = await chooseProfile(profileFiles());
  const short = shortenHome(folder);
  if (value !== null || profile === null || !plainPath.test(short)) {
    return false;
  }
  const current = (await readText(profile)) ?? "";
  await appendFile(
    profile,
    `${lineBreakAfter(current)}export THEOS=${short}\n`,
  );
  return true;
}
