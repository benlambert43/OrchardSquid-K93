# OrchardSquid-K93

An all-in-one tool for administering and modifying an iPad 2 (K93, iPad2,1) from a computer. The desktop app reaches the iPad over USB, and the web app, the API, and the database grow alongside it as admin operations are added.

So far the apps show a status list: the API, the database, and, in the desktop app, the iPad attached by USB with its name, model, and iOS version. See [iPad](#ipad) for how the connection works.

| Workspace                  | What it is                                                                     |
| -------------------------- | ------------------------------------------------------------------------------ |
| `orchardsquid-k93-web`     | Next.js web app                                                                |
| `orchardsquid-k93-server`  | Express API on Node.js, with Drizzle ORM and PostgreSQL                        |
| `orchardsquid-k93-shared`  | Zod schemas, types, and the API client, imported as `@orchardsquid-k93/shared` |
| `orchardsquid-k93-ui`      | React components and the Tailwind theme, imported as `@orchardsquid-k93/ui`    |
| `orchardsquid-k93-desktop` | Electron desktop app: a dashboard and a shell for the iPad                     |

## Getting started

Requires Node.js 26 (see `.nvmrc`), Docker, and [ShellCheck](https://www.shellcheck.net/) (`brew install shellcheck`).

```sh
npm install          # installs every workspace and the Husky pre-commit hook
npm run db:start     # starts PostgreSQL, waits for it, and applies the migrations
npm run dev          # web app on http://localhost:3000
npm run dev:server   # API on http://localhost:4000, in a second terminal
```

### Environment

A `.env` beside each `.env.template` was written with local defaults when the project was generated. On a fresh clone, copy each template and fill in `<username>`, `<password>`, and `<database_name>`:

```sh
for file in .env.template */.env.template; do cp "$file" "${file%.template}"; done
```

| File                           | Variables                                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env`                         | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `POSTGRES_PORT`, the port PostgreSQL listens on from your machine. Docker Compose reads them |
| `orchardsquid-k93-server/.env` | The same four, which must match the root file, and `POSTGRES_HOST`, `API_PORT`, and `BASE_FRONTEND_URL`, the web app's address                        |
| `orchardsquid-k93-web/.env`    | `API_BASE_URL`, where the web app finds the API, and `SITE_URL`, the web app's public address                                                         |

Git ignores every `.env*` file except the templates.

## Commands

Run everything from the repository root.

### Develop and build

| Command                 | What it does                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run dev`           | Starts the Next.js dev server                                                                    |
| `npm run dev:server`    | Starts the API with `node --watch`, restarting on changes to the server or shared sources        |
| `npm run dev:desktop`   | Starts the desktop app in `orchardsquid-k93-desktop` with a hot-reloading window                 |
| `npm run build`         | Builds the web app                                                                               |
| `npm run build:desktop` | Packages the desktop app for this machine into `orchardsquid-k93-desktop/out`                    |
| `npm run make:desktop`  | Packages the desktop app and zips it into `orchardsquid-k93-desktop/out/make`, ready to hand out |

Nothing is compiled during development. Node.js runs the server's TypeScript directly, and shared code is imported straight from its sources. Between the API and the web app, only the web app has a build step.

```sh
npm run dev --workspace orchardsquid-k93-web -- --port 3001   # dev server on another port
npm run start --workspace orchardsquid-k93-web                # serves the output of npm run build
npm run start --workspace orchardsquid-k93-server             # API without --watch
```

Scripts such as `dev`, `build`, and `db:generate` hand over to a workspace's script of the same name. To give the tool behind one an argument, call the workspace's script as above: `npm run <script> --workspace <workspace> -- <arguments>`. Scripts that run a tool themselves, such as `lint` and `test`, take arguments straight after `--`.

### Database

| Command               | What it does                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:start`    | Starts PostgreSQL in Docker, waits until it is healthy, and applies pending migrations                                            |
| `npm run db:stop`     | Stops PostgreSQL and keeps its data                                                                                               |
| `npm run db:generate` | Generates a SQL migration in `orchardsquid-k93-server/drizzle` from the Drizzle schema in `orchardsquid-k93-server/src/schema.ts` |
| `npm run db:migrate`  | Applies pending migrations to a running database; `db:start` runs it for you                                                      |
| `npm run db:studio`   | Opens Drizzle Studio to browse the database                                                                                       |

The schema has no tables yet. To add one, define it in `schema.ts`, then run `db:generate` and `db:migrate`.

```sh
npm run db:generate --workspace orchardsquid-k93-server -- --name add_devices          # names the migration file
npm run db:generate --workspace orchardsquid-k93-server -- --custom --name seed_data   # empty migration for SQL of your own
npm run db:studio --workspace orchardsquid-k93-server -- --port 5000                   # Drizzle Studio on another port
```

### Checks

| Command               | What it does                                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run preflight`   | Everything CI runs: format check, typecheck, lint, ShellCheck, the editor-settings check, tests, and the build. `preflight:no-build` skips the build       |
| `npm run format`      | Formats the whole repository with Prettier; `format:check` only reports                                                                                    |
| `npm run lint`        | Runs ESLint over the whole repository, including the React, accessibility, and Tailwind class rules and the deprecated-API check; `lint:fix` applies fixes |
| `npm run lint:shell`  | Runs ShellCheck over the shell scripts and the pre-commit hook                                                                                             |
| `npm run lint:editor` | Fails on `.vscode/settings.json` keys that the installed VS Code or its extensions mark as deprecated; skipped where VS Code is absent, as in CI           |
| `npm run typecheck`   | Type-checks the root config files and scripts, then every workspace; the web one generates the Next.js route types first                                   |

```sh
npm run preflight:no-build                         # every check, without the build
npm run lint -- orchardsquid-k93-web                       # one folder
npm run lint:fix -- orchardsquid-k93-web/app/page.tsx      # one file
npx prettier --write README.md                     # formats one file
npm run typecheck --workspace orchardsquid-k93-server      # one workspace
```

The pre-commit hook runs lint-staged on the staged files: every workspace is type-checked, ESLint and Prettier fix what they can, the tests that cover the staged files run, and staged shell scripts go through ShellCheck. CI runs the same checks as `npm run preflight`, split into parallel jobs.

### Tests

| Command                 | What it does                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `npm test`              | Runs Vitest once across every workspace                                                         |
| `npm run test:watch`    | Reruns tests as files change                                                                    |
| `npm run test:coverage` | Reports coverage in the terminal and as HTML in `coverage/`                                     |
| `npm run test:shared`   | Runs one workspace; the others have a script of their own, such as `test:server` and `test:web` |

`orchardsquid-k93-shared` and `orchardsquid-k93-server` have no tests yet, so their projects pass with no test files.

```sh
npm test -- orchardsquid-k93-ui/src/AppShell.test.tsx   # one file
npm test -- -t "Hello World"                           # tests whose name matches
npm run test:watch -- --project orchardsquid-k93-web   # watches one workspace
```

### Cleaning up

| Command                 | What it does                                                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run clean:dry-run` | Lists what `clean` would remove and deletes nothing                                                                                                                                       |
| `npm run clean`         | Removes dependencies, ignored files such as build output, and the dev database with its data. `.env` files are kept. Refuses while untracked files exist, because Git has no copy of them |
| `npm run clean:force`   | Does the same and deletes the untracked files too                                                                                                                                         |
| `npm run reset`         | Rebuilds the development environment: `clean`, `npm install`, then `db:start`                                                                                                             |

```sh
npm run clean:dry-run -- --force   # lists what clean:force would remove
```

## API

`orchardsquid-k93-server` serves JSON on `http://localhost:4000`. Errors are JSON as well, in the form `{"error": "..."}`: 404 for an unknown route, 400 for a body that is not valid JSON, and 500 for a failure the API did not expect, which it logs.

| Route                | What it does                                                               |
| -------------------- | -------------------------------------------------------------------------- |
| `GET /api/v1/health` | Reports whether the API reaches the database; answers 503 when it does not |

```sh
curl http://localhost:4000/api/v1/health
```

New routes go in a router of their own in `orchardsquid-k93-server/src`, mounted under `/api/v1` in `src/index.ts`, with their request and response schemas in `orchardsquid-k93-shared` and a method for each on the client from `createApiClient`.

## Where the code lives

The status list is the path from the API to the components that every new feature follows.

| Layer                       | Where                                                                           |
| --------------------------- | ------------------------------------------------------------------------------- |
| Tables and migrations       | `orchardsquid-k93-server/src/schema.ts` and `orchardsquid-k93-server/drizzle`   |
| Routes                      | `orchardsquid-k93-server/src/index.ts`                                          |
| Error responses             | `orchardsquid-k93-server/src/errors.ts`                                         |
| Server environment          | `orchardsquid-k93-server/src/serverEnv.ts`, parsed with Zod when the API starts |
| Schemas and types           | `orchardsquid-k93-shared/src/health.ts`                                         |
| API client                  | `orchardsquid-k93-shared/src/apiClient.ts`                                      |
| Components and theme        | `orchardsquid-k93-ui/src`                                                       |
| Web page and data loading   | `orchardsquid-k93-web/app/page.tsx` and `app/_components`                       |
| Desktop window and the iPad | `orchardsquid-k93-desktop/src`; see [Desktop app](#desktop-app)                 |

## Shared components

`orchardsquid-k93-ui` holds the components that look and behave the same wherever they are shown. An app only decides what data they get and what happens when they are used.

- **Props only.** Components take their data and their actions as props. They never fetch, read the environment, or import a framework, and ESLint refuses `next` and `node:` imports in the package.
- **Logic sits beside the schemas.** `orchardsquid-k93-shared` holds what the web app and the API both need: the schemas, and `createApiClient`, which builds the client that the web app gives the API's address. The package runs in Node.js and in browser windows alike, so ESLint refuses browser-only globals there.
- **The web app supplies data from the server.** `app/_components/StatusChecks.tsx` loads the API's health in a server component and hands it to the shared components. Changes from a form go through server actions, which refresh the page afterwards.
- **The desktop app supplies data from its main process.** `orchardsquid-k93-desktop/src/renderer/Dashboard.tsx` asks it over the bridge for what the iPad reports. The desktop app does not call the API.
- **`"use client"` where needed.** Components with state or event handlers start with it, which lets the App Router render them from server components. The others have no directive, so they can render on the server as well.
- **One theme.** `src/theme.css` is the one place for colors and fonts, and it tells Tailwind to scan the package for class names. Each app's `globals.css` imports it after `tailwindcss` and provides the fonts behind `--font-geist-sans` and `--font-geist-mono` in its own way.
- **No build step.** The apps compile the package from source, as the web app does `@orchardsquid-k93/shared`, so an edit hot-reloads in every app that is running.
- **Linted like the web app.** The web app gets its React and accessibility rules from `eslint-config-next`. React code outside it is held to the React, hooks, and accessibility rule sets of the same plugins, and may not use Node.js globals.
- **Tests beside the components.** They run in jsdom with Testing Library; `npm run test:ui` runs them alone.

A component belongs in `orchardsquid-k93-ui` when more than one app shows it, or could. Create it in `src`, export it from `src/index.ts`, and import it from `@orchardsquid-k93/ui`. Pages and the components that load data stay in the app they belong to.

## Search engines and link previews

The web app describes itself to search engines and to the apps that show a preview when a link is pasted into them. All of it is prerendered when the app is built. The files are in `orchardsquid-k93-web`.

| File                      | What it does                                                                                                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/_lib/site.ts`        | Holds the name and the description, which the layout, the home page, and the preview image all read, and `siteUrl()`, the public address from `SITE_URL`                                                                         |
| `app/layout.tsx`          | Sets what every page shares: the base address, the title and its template, the description, and the Open Graph and Twitter card settings. A page whose `metadata` has a `title` of `About` is titled "About \| OrchardSquid-K93" |
| `app/page.tsx`            | States its own address in `alternates.canonical` and `openGraph.url`, and spreads `siteOpenGraph` into the latter, because a page's `openGraph` replaces the layout's instead of merging with it. Do the same in every new page  |
| `app/opengraph-image.tsx` | Draws the 1200 by 630 preview image, which Next.js attaches to every page for Open Graph and Twitter. An `opengraph-image.tsx` in a route's folder gives that route its own                                                      |
| `app/robots.ts`           | Lets crawlers in and points them at the sitemap                                                                                                                                                                                  |
| `app/sitemap.ts`          | Lists the pages. Add each new public page to it                                                                                                                                                                                  |

`SITE_URL` is compiled into the pages, so a production build needs the real address and fails without any. CI builds with a local address, only to prove that the app builds.

```sh
SITE_URL=https://example.com npm run build
```

## Tooling notes

- **Two TypeScript versions, on purpose.** The workspaces type-check with TypeScript 7, the native compiler, which `next build` also uses. The root keeps TypeScript 6 because typescript-eslint's type-aware rules still need the JavaScript compiler API. VS Code uses that copy too (`js/ts.tsdk.path` in `.vscode/settings.json`), because the TypeScript 7 package ships no language server. Dependabot leaves TypeScript's major and minor versions alone for the same reason; bump them by hand.
- **One config for the repository.** ESLint, Prettier, and lint-staged are configured at the root and cover every workspace, so run them from the root. Vitest's root config lists the workspace projects, each of which keeps its own `vitest.config.ts`. Every config file is TypeScript: Node.js 26 loads them directly, and ESLint reads `eslint.config.ts` through `jiti`.
- **The editor agrees with preflight.** A passing `npm run preflight` should leave nothing underlined in VS Code. ESLint fails on deprecated APIs and lints Tailwind classes with `eslint-plugin-better-tailwindcss`, which makes the same checks as the Tailwind CSS IntelliSense extension, so `.vscode/settings.json` turns those three IntelliSense lints off. Prettier wraps long class lists, so the plugin's line-wrapping rule is the one rule switched off.
- **ShellCheck reads `.shellcheckrc`**, so a script checked on its own in the editor follows `scripts/lib.sh` just as `lint:shell` does.
- **`overrides` in `package.json`.** One entry points every `eslint` peer dependency at the root ESLint 10, because some plugins bundled with `eslint-config-next` still declare ESLint 9. The other lets `@esbuild-kit/core-utils`, a deprecated package that `drizzle-kit` lists but never loads, share the esbuild already installed instead of adding an old release with a known advisory.
- **`allowScripts` in `package.json`** is npm's install-script policy and names the packages whose install scripts may run. When `npm install` reports an unreviewed package, look at what its script does and approve it. `prune` drops the entries that an update has made unnecessary. An entry set to `false` is a script that was looked at and turned down: `ssh2` and `cpu-features` only compile optional add-ons that the desktop app does not load.

  ```sh
  npm install-scripts approve <package>
  npm install-scripts prune
  ```

- **`.npmrc` sets `engine-strict`**, so `npm install` stops on a Node.js older than 26.

## Debugging

`.vscode/launch.json` starts the API or an app under the VS Code debugger from Run and Debug. Breakpoints in the TypeScript sources bind in the Node.js processes, such as the API and the Next.js server; code that runs in a browser window is debugged with the window's developer tools.

## Desktop app

`orchardsquid-k93-desktop` is an Electron app for looking after the iPad. It has three pages: the Dashboard, which shows what the iPad reports about itself, the Shell, a terminal on the iPad, and Settings, which backs up and restores the SSH key. All three are built from the shared components. Its window is a React app compiled by Vite. The app uses neither the API nor its database: everything the window shows comes from the iPad by way of the main process, which owns the window, its security rules, and every connection to the iPad, and talks to the window over a small typed bridge. If the app comes to need data of its own, it is to keep it in SQLite on this computer.

```text
window (React, sandboxed) ⇄ window.bridge ⇄ preload script ⇄ IPC ⇄ main process
main process → usbmuxd → USB → iPad
```

### Commands

```sh
npm run dev:desktop     # starts the app; press r in this terminal to restart the main process
npm run test:desktop    # runs its tests alone
npm run build:desktop   # packages an unsigned app for this machine
npm run make:desktop    # packages it and zips it
```

`npm run preflight` packages the app after the web build, and CI packages it in a job of its own. Arguments for Electron Forge go to the workspace's scripts:

```sh
npm run dev --workspace orchardsquid-k93-desktop -- --inspect-electron   # main process under a debugger
npm run make --workspace orchardsquid-k93-desktop -- --arch x64          # another architecture
```

### Files

Paths are inside `orchardsquid-k93-desktop`.

| File                         | What it holds                                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/renderer/App.tsx`       | The sidebar and the page beside it, which `src/renderer/navigation.ts` picks from the part of the address after `#`                                                                          |
| `src/renderer/Dashboard.tsx` | The Dashboard page: loads the checks and hands them to the shared components                                                                                                                 |
| `src/renderer/Shell.tsx`     | The Shell page: an [xterm.js](https://xtermjs.org) terminal joined to the shell session in the main process                                                                                  |
| `src/renderer/Settings.tsx`  | The Settings page, which holds the SSH backup panel                                                                                                                                          |
| `src/renderer/SshBackup.tsx` | The SSH backup panel, with the Export backup and Restore backup buttons                                                                                                                      |
| `src/renderer/format.ts`     | Writes sizes and durations the way the Dashboard shows them                                                                                                                                  |
| `src/bridge.ts`              | The `Bridge` type: `Requests` lists every call the window can make to the main process, and `Events` everything the main process sends to the window; the files below are typed against both |
| `src/preload/index.ts`       | Exposes one function per request and one `on…` subscription per event as `window.bridge`, and nothing else                                                                                   |
| `src/main/handlers.ts`       | Implements each request, and checks its arguments with Zod first                                                                                                                             |
| `src/main/events.ts`         | Sends an event to the window                                                                                                                                                                 |
| `src/main/usbmux.ts`         | Talks to `usbmuxd`: finds a device attached by USB and opens a connection to a TCP port on it                                                                                                |
| `src/main/ipad.ts`           | Finds the iPad 2, asks it for its name, model, and iOS version, and opens a port on it for the files below                                                                                   |
| `src/main/ssh.ts`            | Connects to the iPad's SSH server and signs in                                                                                                                                               |
| `src/main/system.ts`         | Reads the iPad's uptime, load, memory, and storage over SSH                                                                                                                                  |
| `src/main/shell.ts`          | Holds the shell session that the Shell page shows                                                                                                                                            |
| `src/main/backup.ts`         | Gathers the key and the SSH settings that concern the iPad into a zip file                                                                                                                   |
| `src/main/restore.ts`        | Reads a backup, checks it, and puts what it holds into `~/.ssh`                                                                                                                              |
| `src/main/backupFormat.ts`   | The backup's format: a Zod schema for each JSON file, which export and restore share                                                                                                         |
| `src/main/backupDialogs.ts`  | The dialogs around both: where to save, which file to open, and whether to replace a key                                                                                                     |
| `src/main/sshFiles.ts`       | Where the files in `~/.ssh` are, and how the key and `config` are read                                                                                                                       |
| `src/main/index.ts`          | The window, and the security rules listed below                                                                                                                                              |
| `forge.config.ts`            | Electron Forge: packaging, the Vite builds, and the fuses                                                                                                                                    |

The bridge is for what only the main process can do, such as reporting the app version and reaching the iPad. To add a call, add it to `Requests`. TypeScript then fails until the preload script exposes it and `handlers.ts` implements it. To send something the other way, add it to `Events`, expose its subscription in the preload script, and call `send` in the main process.

### iPad

The app reaches the iPad through its USB cable and nothing else, so Wi-Fi and the iPad's address play no part. The Dashboard's iPad panel needs nothing installed on the iPad, and the iPad does not have to trust the computer first. The System panel and the Shell page need an SSH server on the iPad, which is OpenSSH from Cydia.

```text
main process → /var/run/usbmuxd → USB → lockdownd on the iPad, port 62078
main process → /var/run/usbmuxd → USB → sshd on the iPad, port 22
```

- **`usbmuxd`** is the service macOS runs to carry TCP connections to a device over its USB cable. `src/main/usbmux.ts` asks it which devices are attached and for a connection to a port on one of them. Any port the iPad listens on is reached the same way.
- **The iPad 2** is told apart by its USB product ID, `0x129f`, which belongs to the Wi-Fi model: iPad2,1, or K93. Every other device is ignored.
- **`lockdownd`** is the service on the iPad that answers a computer before the two are paired. `src/main/ipad.ts` sends it a `GetValue` request, and the Dashboard shows the name, model, and iOS version that come back.
- **SSH** runs over the same cable. `src/main/ssh.ts` hands the connection from `usbmuxd` to [ssh2](https://github.com/mscdex/ssh2) and signs in as `root` with the key in `~/.ssh/orchardsquid-k93`. `orchardsquid-k93-desktop/README.md` has the two commands that create the key and add it to the iPad. Where the iPad refuses the key, the Shell page asks for the password, up to three times, and the System panel says that the key is missing. The password is passed on to the iPad and never stored.
- **The host key is not checked.** The connection never leaves the cable, so there is no network on which something else could answer as the iPad.
- **The System panel** comes from one command run over SSH, which `src/main/system.ts` parses. It uses `sysctl`, `vm_stat`, `df`, `ps`, and `dpkg-query`, all of which a freshly jailbroken iPad 2 had. Refresh asks the iPad again.
- **The shell session** lives in the main process, so it outlasts a change of page and a reload of the window. `src/main/shell.ts` keeps the last megabyte of output and replays it when the Shell page comes back. Typing `exit` ends the session, and New session starts another.

### SSH backup

The Settings page saves and restores what a computer needs in order to sign in to the iPad. Export backup gathers it into a zip file, asks where to save the file, and writes it so that only its owner can read it. Restore backup reads such a file back in on another computer, which can then sign in without the password. The file holds the private key as it is on disk, so whoever has the file can sign in to the iPad as `root`.

Everything in the zip file is JSON, and `src/main/backupFormat.ts` holds the schema that export and restore share:

| File               | What it holds                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `manifest.json`    | The format's name and `version`, when and on which computer the backup was made, the app's version, and the names of the other files |
| `key.json`         | The text of `~/.ssh/orchardsquid-k93` and of its `.pub`, with the key's type and fingerprint                                         |
| `connection.json`  | How the app signs in: over USB, to which port, and as which user                                                                     |
| `ipad.json`        | The iPad the key opens, and the host key its SSH server presented                                                                    |
| `known-hosts.json` | The lines of `~/.ssh/known_hosts` that carry that host key                                                                           |
| `ssh-config.json`  | The `Host` blocks of `~/.ssh/config` that name the key, or that point at an address from those lines                                 |

- **Only what concerns the iPad is copied.** Other hosts in `known_hosts` and `config` stay out, and so do `Match` blocks and the iPad's password.
- **Connect the iPad before exporting.** Its host key is what picks out the lines and blocks that belong to it. Without the iPad the backup still holds the key, but no `known_hosts` lines and only the `Host` blocks that name the key, and the Settings page says so.
- **Restore treats the file as untrusted.** It changes nothing unless every file in the backup passes its schema, the key can be read, and each `known_hosts` line carries the host key in `ipad.json`. It writes only to `~/.ssh/orchardsquid-k93`, its `.pub`, `known_hosts`, and `config`, whatever path the backup names.
- **Nothing is overwritten.** A different key already at `~/.ssh/orchardsquid-k93` is replaced only after a confirmation, and is kept beside the new one under a name that ends in `.replaced-` and the time. Lines and `Host` blocks are only added to `known_hosts` and `config`, and a `Host` whose name `config` already has is left as it is.
- **Some `Host` blocks are left out.** A block is restored only if its names have no wildcards and every option in it is on the list in `src/main/restore.ts`, which has none that runs a command or sends the connection somewhere else, such as `ProxyCommand` and `ProxyJump`. The Settings page names the blocks it left out.
- **By hand**, the same restore is a few commands, which `orchardsquid-k93-desktop/README.md` lists.
- **Git ignores zip files**, so that a backup saved inside the repository is not committed by accident.

### Configuration

- **No environment.** The app reads no `.env` file and no environment variable, so there is nothing to set before it is started or packaged.
- **Shipping.** `npm run build:desktop` produces an unsigned app with the default icon. Signing, notarization, installers, an icon, a bundle identifier of your own, and updates are all [Electron Forge](https://www.electronforge.io) configuration, to add in `forge.config.ts` when the app ships.

### Development

- **Forge and Vite.** Electron Forge runs development, packaging, and distribution, and its Vite plugin bundles from `vite.main.config.ts`, `vite.preload.config.ts`, and `vite.renderer.config.ts`. Forge emits the first two as CommonJS, because a sandboxed preload script cannot load ES modules.
- **Reloading.** The window hot-reloads, including after an edit to `orchardsquid-k93-ui`, and a change to the preload script reloads it. Edits to that package reach the window because `vite.renderer.config.ts` sets `resolve.preserveSymlinks` to `false`: Forge's Vite plugin turns it on, and Vite then takes the package for a dependency in `node_modules`, bundles it once, and stops looking at its sources. A change to the main process is rebuilt at once but takes effect when the app restarts: press `r` in the terminal that runs `npm run dev:desktop`, or type `rs` and Enter where that terminal is not interactive. Forge's `hotRestart` option is meant to do this by itself but does not restart the app as of Forge 8.0.1; turn it on in `forge.config.ts` once it does.
- **No native add-ons.** ssh2 can use two optional ones, its own and `cpu-features`, and runs without either. Neither is built: their install scripts are denied in `allowScripts`, `forge.config.ts` tells Forge not to rebuild `cpu-features` for Electron, and `vite.main.config.ts` leaves it out of the bundle, where ssh2's attempt to load it fails quietly.
- **Imports** inside the app start from `src` with `@/`, as they start from the app folder in the web app. Stack traces from the main process point at the TypeScript source.
- **One copy runs.** A second launch brings the first one's window forward. The app started by `npm run dev:desktop` keeps its own data folder, with `(development)` after the name, so it runs beside an installed copy.
- **Fast startup.** Each process loads one bundled file, compiled for the Chromium and Node.js that Electron ships rather than for older browsers. Geist is bundled instead of fetched, `app://` is registered so that V8 keeps the window's compiled script from the first launch on, and the window opens at once in the page's background color.
- **The default application menu stays**, because on macOS it is what makes copy, paste, and undo work in text fields. Replace it with your own rather than removing it.
- **Electron's binary** is not downloaded by `npm install`. The `electron` package fetches it the first time the app is started or packaged, and caches it for later installs.
- **`@types/node` is held at 24** here because Electron 45 embeds Node.js 24, whatever runs the rest of the repository. Dependabot leaves major versions of `@types/node` alone for that reason, so raise this one by hand when an Electron upgrade brings a newer Node.js.

### Security

- **The window has no access to Node.js or Electron.** Every renderer is sandboxed and context-isolated, and the preload script exposes named functions instead of `ipcRenderer`. The main process accepts calls only from the app's own page.
- **Lint and types draw the same line.** ESLint keeps `electron`, `node:` modules, Node.js globals, and the main process's own files out of `src/renderer`. `src/renderer/tsconfig.json` checks the window's code without the Node.js types, and `tsconfig.json` checks everything else without the DOM types.
- **A packaged app loads its window from `app://renderer`**, a protocol the main process serves from the app's own files, since `file://` pages have no origin to build rules on.
- **Content-Security-Policy.** The page may load its own files and show `data:` images, and may connect to nothing but the address it was loaded from, with no plugins, `<base>` element, or form posts. Inline scripts are allowed only for Vite's dev server. Inline styles are allowed everywhere, because xterm.js writes `<style>` elements and `style` attributes as it draws the terminal, and the Shell page is unreadable without them. `src/contentSecurityPolicy.ts` builds the policy, Vite's dev server sends it in development, and the `app://` handler sends it with every file of a packaged app.
- **The shell is `root` on the iPad.** Whatever runs in the window can type into it, which is one more reason the window loads nothing but the app's own files. The main process checks the shape of every argument the window sends before it acts on it.
- **Navigation.** Leaving the app and opening new windows are refused, and `https` addresses, whether from a link or `window.open`, open in the default browser.
- **Permissions** are refused, both when the page asks for one and when Chromium only checks it, except writing to the clipboard and going fullscreen. Add to `grantedPermissions` in `src/main/index.ts` as the app needs more.
- **Fuses.** The fuses in `forge.config.ts` are flipped when the app is packaged. They stop the binary from running as plain Node.js or taking debugger and `NODE_OPTIONS` flags, and make it load code only from `app.asar`. On macOS and Windows it also verifies that archive before loading it; Electron has no such check on Linux.
