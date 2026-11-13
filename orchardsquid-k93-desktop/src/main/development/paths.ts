import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export function shortenHome(file: string): string {
  const home = os.homedir();
  return file === home || file.startsWith(home + path.sep)
    ? `~${file.slice(home.length)}`
    : file;
}
