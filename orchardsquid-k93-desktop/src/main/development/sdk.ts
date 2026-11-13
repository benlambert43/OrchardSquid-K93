import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { developmentTarget } from "@/developmentSetup.ts";
import { exists } from "@/main/development/paths.ts";
import type { Announce } from "@/main/development/progress.ts";
import { readText } from "@/main/sshFiles.ts";

const stubExtension = ".tbd";
const frameworkExtension = ".framework";
const oldModuleMap = "module.map";
const moduleMap = "module.modulemap";
const cLibraryStub = "usr/lib/system/libsystem_c.tbd";
const objcModuleMap = path.join("usr/include/objc", oldModuleMap);
const architectureList = /(archs:\s*\[)([^\]]*)(\])/g;
const firstSymbolList = /(?<![\w-])symbols:\s*\[/;
const sectionStart = "- archs:";
const simulatorArchitectures = new Set(["i386", "x86_64", "x86_64h"]);

const aliasedFunctions = [
  "_bzero",
  "_memccpy",
  "_memchr",
  "_memcmp",
  "_memcpy",
  "_memmove",
  "_memset",
  "_memset_pattern16",
  "_memset_pattern4",
  "_memset_pattern8",
  "_strchr",
  "_strcmp",
  "_strncmp",
];

function listsSimulators(stub: string): boolean {
  return [...stub.matchAll(architectureList)].some(([, , list = ""]) =>
    list.split(",").some((name) => simulatorArchitectures.has(name.trim())),
  );
}

function withoutSimulators(stub: string): string {
  return stub.replaceAll(
    architectureList,
    (match, open: string, list: string, close: string) => {
      const kept = list
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name && !simulatorArchitectures.has(name));
      return kept.length > 0 ? `${open} ${kept.join(", ")} ${close}` : match;
    },
  );
}

function exportsFunction(stub: string, name: string): boolean {
  return new RegExp(String.raw`[\[\s,]${name}[\],\s]`).test(stub);
}

function withAliasedFunctions(stub: string): string {
  const missing = aliasedFunctions.filter(
    (name) => !exportsFunction(stub, name),
  );
  const list = firstSymbolList.exec(stub);
  const section = stub.slice(
    stub.lastIndexOf(sectionStart, list?.index),
    list?.index,
  );
  if (
    missing.length === 0 ||
    !list ||
    !section.includes(developmentTarget.architecture)
  ) {
    return stub;
  }
  const start = list.index + list[0].length;
  return `${stub.slice(0, start)} ${missing.join(", ")},${stub.slice(start)}`;
}

async function rewrite(
  file: string,
  change: (text: string) => string,
): Promise<void> {
  const text = await readFile(file, "utf8");
  const changed = change(text);
  if (changed !== text) {
    await writeFile(file, changed);
  }
}

async function renameModuleMap(folder: string): Promise<void> {
  const target = folder.endsWith(frameworkExtension)
    ? path.join(folder, "Modules", moduleMap)
    : path.join(folder, moduleMap);
  if (!(await exists(target))) {
    await mkdir(path.dirname(target), { recursive: true });
    await rename(path.join(folder, oldModuleMap), target);
  }
}

export async function isSdkAdjusted(folder: string): Promise<boolean> {
  const stub = (await readText(path.join(folder, cLibraryStub))) ?? "";
  return (
    !listsSimulators(stub) &&
    aliasedFunctions.every((name) => exportsFunction(stub, name)) &&
    !(await exists(path.join(folder, objcModuleMap)))
  );
}

export async function adjustSdk(
  folder: string,
  announce: Announce,
): Promise<void> {
  announce("adjust", null, 0);
  const files = (
    await readdir(folder, { recursive: true, withFileTypes: true })
  ).filter((entry) => entry.isFile());
  const stubs = files.filter(({ name }) => name.endsWith(stubExtension));
  for (const [index, { parentPath, name }] of stubs.entries()) {
    await rewrite(path.join(parentPath, name), withoutSimulators);
    announce("adjust", null, (index + 1) / stubs.length);
  }
  for (const { parentPath, name } of files) {
    if (name === oldModuleMap) {
      await renameModuleMap(parentPath);
    }
  }
  await rewrite(path.join(folder, cLibraryStub), withAliasedFunctions);
}
