import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { BrowserWindow, dialog, type OpenDialogOptions } from "electron";

import type {
  DevelopmentProject,
  ProjectBuild,
  ProjectCreate,
  ProjectEdit,
  ProjectOpen,
  ProjectReading,
} from "@/bridge.ts";
import {
  type BuildOption,
  developmentTarget,
  projectEditor,
  type ProjectTemplate,
  projectTemplates,
} from "@/developmentSetup.ts";
import { exists, shortenHome } from "@/main/development/paths.ts";
import { lastLines, runProcess } from "@/main/development/process.ts";
import {
  type ReportProgress,
  withProgress,
} from "@/main/development/progress.ts";
import { exclusively } from "@/main/development/tasks.ts";
import { findTheosFolder } from "@/main/development/tools.ts";
import { readSetting, writeSetting } from "@/main/settings.ts";
import { readText } from "@/main/sshFiles.ts";
import { installPackageOnIpad } from "@/main/system.ts";

const openFile = "/usr/bin/open";
const perlFile = "/usr/bin/perl";
const makeFile = "/usr/bin/make";
const projectSetting = "developmentProject";
const makefileName = "Makefile";
const controlFiles = ["control", "layout/DEBIAN/control"];
const packageFolder = "packages";
const packageExtension = ".deb";
const createTimeoutMs = 60 * 1000;
const buildTimeoutMs = 10 * 60 * 1000;
const editorTimeoutMs = 30 * 1000;

const { sdkVersion, minimumVersion, architecture, compilerFlags } =
  developmentTarget;
const target = `iphone:clang:${sdkVersion}:${minimumVersion}`;

const theosMakefile = /\$\(THEOS(?:_MAKE_PATH)?\)/;
const targetLine = /^TARGET[ \t]*:?=[ \t]*(.*)$/m;
const architectureLine = /^ARCHS[ \t]*:?=[ \t]*(.*)$/m;
const includedKind = /^include \$\(THEOS_MAKE_PATH\)\/(\w+)\.mk/gm;
const sharedKinds = new Set(["aggregate"]);
const builtPackage = /building package .+ in [`'](.+\.deb)'/;
const buildStage = /^(?:==>|>) (.+?)…?$/;
const notice = "Notice:";

async function chooseFolder(
  options: OpenDialogOptions,
): Promise<string | null> {
  const window = BrowserWindow.getFocusedWindow();
  const { canceled, filePaths } = await (window
    ? dialog.showOpenDialog(window, options)
    : dialog.showOpenDialog(options));
  const [folder] = filePaths;
  return canceled || !folder ? null : folder;
}

function readField(control: string, name: string): string | null {
  return (
    new RegExp(`^${name}:[ \\t]*(.+)$`, "m").exec(control)?.[1]?.trim() ?? null
  );
}

async function readControl(folder: string): Promise<string> {
  for (const file of controlFiles) {
    const control = await readText(path.join(folder, file));
    if (control !== null) {
      return control;
    }
  }
  return "";
}

async function findLatestPackage(
  folder: string,
): Promise<DevelopmentProject["latestPackage"]> {
  const packages = path.join(folder, packageFolder);
  const files = (await readdir(packages).catch((): string[] => [])).filter(
    (file) => file.endsWith(packageExtension),
  );
  const built = await Promise.all(
    files.map(async (file) => ({
      file,
      builtAt: (await stat(path.join(packages, file))).mtimeMs,
    })),
  );
  return built.toSorted((a, b) => b.builtAt - a.builtAt)[0] ?? null;
}

async function readProject(folder: string): Promise<DevelopmentProject | null> {
  const makefile = await readText(path.join(folder, makefileName));
  if (makefile === null || !theosMakefile.test(makefile)) {
    return null;
  }
  const control = await readControl(folder);
  const kinds = [...makefile.matchAll(includedKind)].flatMap(([, kind]) =>
    kind && !sharedKinds.has(kind) ? [kind] : [],
  );
  return {
    folder: shortenHome(folder),
    name: path.basename(folder),
    kind: kinds[0] ?? null,
    package: readField(control, "Package"),
    version: readField(control, "Version"),
    target: targetLine.exec(makefile)?.[1]?.trim() ?? null,
    architectures: architectureLine.exec(makefile)?.[1]?.trim() ?? null,
    latestPackage: await findLatestPackage(folder),
  };
}

export async function readDevelopmentProject(): Promise<ProjectReading> {
  const folder = readSetting(projectSetting);
  if (folder === null) {
    return { state: "none" };
  }
  const project = await readProject(folder);
  return project
    ? { state: "open", project }
    : { state: "missing", folder: shortenHome(folder) };
}

async function targetIpad(folder: string): Promise<void> {
  const file = path.join(folder, makefileName);
  const makefile = await readFile(file, "utf8");
  const lines = `TARGET := ${target}\nARCHS = ${architecture}`;
  await writeFile(
    file,
    targetLine.test(makefile)
      ? makefile.replace(targetLine, lines)
      : `${lines}\n\n${makefile}`,
  );
}

export async function createDevelopmentProject(
  template: ProjectTemplate,
  name: string,
  packageId: string,
): Promise<ProjectCreate> {
  const parent = await chooseFolder({
    title: `Choose where to create ${name}`,
    buttonLabel: "Create here",
    properties: ["openDirectory", "createDirectory"],
  });
  if (parent === null) {
    return { state: "cancelled" };
  }
  const folder = path.join(parent, name);
  if (await exists(folder)) {
    return { state: "exists", folder: shortenHome(folder) };
  }
  const theos = await findTheosFolder();
  const { code, output } = await runProcess(
    perlFile,
    [
      path.join(theos, "bin/nic.pl"),
      "-t",
      projectTemplates[template],
      "-n",
      name,
      "-p",
      packageId,
    ],
    { cwd: parent, env: { THEOS: theos }, quietTimeoutMs: createTimeoutMs },
  );
  if (code !== 0 || !(await exists(path.join(folder, makefileName)))) {
    return { state: "failed", output: lastLines(output) };
  }
  await targetIpad(folder);
  writeSetting(projectSetting, folder);
  return { state: "created", folder: shortenHome(folder) };
}

export async function openDevelopmentProject(): Promise<ProjectOpen> {
  const folder = await chooseFolder({
    title: "Open a Theos project",
    buttonLabel: "Open",
    properties: ["openDirectory"],
  });
  if (folder === null) {
    return { state: "cancelled" };
  }
  if ((await readProject(folder)) === null) {
    return { state: "invalid", folder: shortenHome(folder) };
  }
  writeSetting(projectSetting, folder);
  return { state: "opened", folder: shortenHome(folder) };
}

export async function editDevelopmentProject(): Promise<ProjectEdit> {
  const folder = readSetting(projectSetting);
  if (folder === null || (await readProject(folder)) === null) {
    return { state: "no-project" };
  }
  const { code } = await runProcess(
    openFile,
    ["-b", projectEditor.bundleId, folder],
    { quietTimeoutMs: editorTimeoutMs },
  );
  return code === 0 ? { state: "opened" } : { state: "no-editor" };
}

export async function buildDevelopmentProject(
  options: BuildOption[],
  report: ReportProgress,
): Promise<ProjectBuild> {
  const folder = readSetting(projectSetting);
  if (folder === null || (await readProject(folder)) === null) {
    return { state: "no-project" };
  }
  return exclusively(() =>
    withProgress("build", "build", report, async (announce) => {
      const theos = await findTheosFolder();
      const { code, output } = await runProcess(
        makeFile,
        ["package", `TARGET=${target}`, `ARCHS=${architecture}`],
        {
          cwd: folder,
          env: { THEOS: theos, ADDITIONAL_CFLAGS: compilerFlags },
          quietTimeoutMs: buildTimeoutMs,
          onLine: (line) => {
            const stage = buildStage.exec(line)?.[1];
            if (stage && !stage.startsWith(notice)) {
              announce("build", stage);
            }
          },
        },
      );
      const built = builtPackage.exec(output)?.[1];
      if (code !== 0 || !built) {
        return { state: "failed", output: lastLines(output) };
      }
      const file = path.basename(built);
      if (!options.includes("install")) {
        return { state: "built", file, install: null };
      }
      const contents = await readFile(path.resolve(folder, built));
      return {
        state: "built",
        file,
        install: await installPackageOnIpad(file, contents, announce),
      };
    }),
  );
}
