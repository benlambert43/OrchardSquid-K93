import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { app } from "electron";

let database: DatabaseSync | null = null;

function open(): DatabaseSync {
  if (!database) {
    database = new DatabaseSync(
      path.join(app.getPath("userData"), "settings.sqlite"),
    );
    database.exec(
      "CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT",
    );
  }
  return database;
}

export function readSetting(name: string): string | null {
  const row = open()
    .prepare("SELECT value FROM settings WHERE name = ?")
    .get(name);
  return typeof row?.value === "string" ? row.value : null;
}

export function writeSetting(name: string, value: string): void {
  open()
    .prepare(
      "INSERT INTO settings (name, value) VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET value = excluded.value",
    )
    .run(name, value);
}
