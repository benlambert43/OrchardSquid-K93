import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

interface Property {
  deprecationMessage?: string;
  markdownDeprecationMessage?: string;
}

interface Configuration {
  properties?: Record<string, Property>;
}

interface Manifest {
  contributes?: { configuration?: Configuration | Configuration[] };
}

const settingsFile = process.argv[2] ?? ".vscode/settings.json";

const knownDirectories = [
  "/Applications/Visual Studio Code.app/Contents/Resources/app",
  path.join(
    os.homedir(),
    "Applications/Visual Studio Code.app/Contents/Resources/app",
  ),
  "/usr/share/code/resources/app",
  "/opt/visual-studio-code/resources/app",
  "/snap/code/current/usr/share/code/resources/app",
  path.join(
    process.env.LOCALAPPDATA ?? "",
    "Programs/Microsoft VS Code/resources/app",
  ),
];

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
}

function cliDirectories(): string[] {
  try {
    const cli = fs.realpathSync(
      execFileSync("which", ["code"], { encoding: "utf8" }).trim(),
    );
    return [
      path.resolve(cli, "../.."),
      path.resolve(cli, "../../resources/app"),
    ];
  } catch {
    return [];
  }
}

function localize(
  message: string,
  strings: Partial<Record<string, string>>,
): string {
  return message
    .replace(/^%(.+)%$/, (_, name: string) => strings[name] ?? name)
    .replace(/`#([^#`]+)#`/g, "`$1`");
}

function deprecations(extensionsDirectory: string): Map<string, string> {
  const found = new Map<string, string>();
  if (!fs.existsSync(extensionsDirectory)) {
    return found;
  }
  for (const entry of fs.readdirSync(extensionsDirectory, {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const directory = path.join(extensionsDirectory, entry.name);
    const manifest = readJson(path.join(directory, "package.json")) as
      Manifest | undefined;
    const configuration = manifest?.contributes?.configuration;
    if (!configuration) {
      continue;
    }
    const strings = (readJson(path.join(directory, "package.nls.json")) ??
      {}) as Partial<Record<string, string>>;
    for (const block of Array.isArray(configuration)
      ? configuration
      : [configuration]) {
      for (const [key, property] of Object.entries(block.properties ?? {})) {
        const message =
          property.markdownDeprecationMessage ?? property.deprecationMessage;
        if (message) {
          found.set(key, localize(message, strings));
        }
      }
    }
  }
  return found;
}

const app = [...cliDirectories(), ...knownDirectories].find((directory) =>
  fs.existsSync(path.join(directory, "extensions")),
);
if (!app) {
  console.log(`VS Code was not found, so ${settingsFile} was not checked.`);
  process.exit(0);
}

const settings = readJson(settingsFile) as Record<string, unknown> | undefined;
if (!settings) {
  console.error(`${settingsFile} is missing or is not valid JSON.`);
  process.exit(1);
}

const deprecated = new Map([
  ...deprecations(path.join(app, "extensions")),
  ...deprecations(path.join(os.homedir(), ".vscode/extensions")),
]);
const findings = Object.keys(settings)
  .filter((key) => deprecated.has(key))
  .map((key) => `  ${key}: ${deprecated.get(key) ?? ""}`);

if (findings.length > 0) {
  console.error(
    `Deprecated VS Code settings in ${settingsFile}:\n${findings.join("\n")}`,
  );
  process.exit(1);
}
console.log(
  `No deprecated VS Code settings in ${settingsFile} (${String(deprecated.size)} deprecated settings known).`,
);
