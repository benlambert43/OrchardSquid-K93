import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { BrowserWindow, dialog, type OpenDialogOptions } from "electron";

import type { PackageInstallReport } from "@/bridge.ts";
import {
  type ReportProgress,
  withProgress,
} from "@/main/development/progress.ts";
import { installPackageOnIpad } from "@/main/system.ts";

const maxPackageBytes = 256 * 1024 * 1024;
const archiveStart = "!<arch>\ndebian-binary";

export async function installIpadPackage(
  report: ReportProgress,
): Promise<PackageInstallReport> {
  const options: OpenDialogOptions = {
    title: "Install package",
    buttonLabel: "Install",
    filters: [{ name: "Debian package", extensions: ["deb"] }],
    properties: ["openFile"],
  };
  const window = BrowserWindow.getFocusedWindow();
  const { canceled, filePaths } = await (window
    ? dialog.showOpenDialog(window, options)
    : dialog.showOpenDialog(options));
  const [filePath] = filePaths;
  if (canceled || !filePath) {
    return { state: "cancelled" };
  }
  const file = path.basename(filePath);
  const { size } = await stat(filePath);
  const contents = size <= maxPackageBytes ? await readFile(filePath) : null;
  if (
    contents?.subarray(0, archiveStart.length).toString("latin1") !==
    archiveStart
  ) {
    return { state: "invalid", file };
  }
  return withProgress("package", "copy", report, (announce) =>
    installPackageOnIpad(file, contents, announce),
  );
}
