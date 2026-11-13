import { chmod, readFile, stat, writeFile } from "node:fs/promises";

import {
  app,
  BrowserWindow,
  dialog,
  type FileFilter,
  type MessageBoxOptions,
  type OpenDialogOptions,
  type SaveDialogOptions,
} from "electron";

import type { SshBackupResult, SshRestoreResult } from "@/bridge.ts";
import { createSshBackup } from "@/main/backup.ts";
import { applySshBackup, readSshBackup } from "@/main/restore.ts";

const ownerOnly = 0o600;
const maxArchiveBytes = 1024 * 1024;
const zipFiles: FileFilter[] = [{ name: "Zip archive", extensions: ["zip"] }];
const replaceButton = 0;
const cancelButton = 1;

function today(): string {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
}

export async function exportSshBackup(): Promise<SshBackupResult> {
  const backup = await createSshBackup(app.getVersion());
  if (!backup) {
    return { state: "no-key" };
  }
  const options: SaveDialogOptions = {
    title: "Export SSH backup",
    buttonLabel: "Export",
    defaultPath: `orchardsquid-k93-ssh-backup-${today()}.zip`,
    filters: zipFiles,
  };
  const window = BrowserWindow.getFocusedWindow();
  const { canceled, filePath } = await (window
    ? dialog.showSaveDialog(window, options)
    : dialog.showSaveDialog(options));
  if (canceled || !filePath) {
    return { state: "cancelled" };
  }
  await writeFile(filePath, backup.archive, { mode: ownerOnly });
  await chmod(filePath, ownerOnly);
  return { state: "saved", path: filePath, ipadIncluded: backup.ipadIncluded };
}

async function confirmReplace(): Promise<boolean> {
  const options: MessageBoxOptions = {
    type: "warning",
    message: "Replace this computer's key for the iPad?",
    detail:
      "This computer already has a different key at ~/.ssh/orchardsquid-k93. Restoring puts the backup's key in its place and keeps the current one beside it under another name.",
    buttons: ["Replace", "Cancel"],
    defaultId: cancelButton,
    cancelId: cancelButton,
  };
  const window = BrowserWindow.getFocusedWindow();
  const { response } = await (window
    ? dialog.showMessageBox(window, options)
    : dialog.showMessageBox(options));
  return response === replaceButton;
}

export async function restoreSshBackup(): Promise<SshRestoreResult> {
  const options: OpenDialogOptions = {
    title: "Restore SSH backup",
    buttonLabel: "Restore",
    filters: zipFiles,
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
  const { size } = await stat(filePath);
  const backup =
    size <= maxArchiveBytes ? readSshBackup(await readFile(filePath)) : null;
  if (!backup) {
    return { state: "invalid" };
  }
  const summary = await applySshBackup(backup, confirmReplace);
  return summary ? { state: "restored", ...summary } : { state: "cancelled" };
}
