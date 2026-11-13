# OrchardSquid-K93

OrchardSquid-K93 toolchain

| Workspace                  | What it is                                                                     |
| -------------------------- | ------------------------------------------------------------------------------ |
| `orchardsquid-k93-web`     | Next.js web app                                                                |
| `orchardsquid-k93-server`  | Express API on Node.js, with Drizzle ORM and PostgreSQL                        |
| `orchardsquid-k93-shared`  | Zod schemas, types, and the API client, imported as `@orchardsquid-k93/shared` |
| `orchardsquid-k93-ui`      | React components and the Tailwind theme, imported as `@orchardsquid-k93/ui`    |
| `orchardsquid-k93-desktop` | Electron desktop app, built from the same components as the web app            |

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

| File                            | Variables                                                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env`                          | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `POSTGRES_PORT`, the port PostgreSQL listens on from your machine. Docker Compose reads them |
| `orchardsquid-k93-server/.env`  | The same four, which must match the root file, and `POSTGRES_HOST`, `API_PORT`, and `BASE_FRONTEND_URL`, the web app's address                        |
| `orchardsquid-k93-web/.env`     | `API_BASE_URL`, where the web app finds the API, and `SITE_URL`, the web app's public address                                                         |
| `orchardsquid-k93-desktop/.env` | `VITE_API_BASE_URL`, where the desktop app finds the API                                                                                              |

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

To change the schema, edit `schema.ts`, then run `db:generate` and `db:migrate`.

```sh
npm run db:generate --workspace orchardsquid-k93-server -- --name add_tags              # names the migration file
npm run db:generate --workspace orchardsquid-k93-server -- --custom --name seed_notes   # empty migration for SQL of your own
npm run db:studio --workspace orchardsquid-k93-server -- --port 5000                    # Drizzle Studio on another port
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

```sh
npm test -- orchardsquid-k93-shared/src/notes.test.ts   # one file
npm test -- -t "Hello World"                    # tests whose name matches
npm run test:watch -- --project orchardsquid-k93-web    # watches one workspace
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

`orchardsquid-k93-server` serves JSON on `http://localhost:4000`. Every route but the health check reads or writes the `notes` table. Errors are JSON as well, in the form `{"error": "..."}`: 404 for an unknown route, 400 for a body that is not valid JSON, and 500 for a failure the API did not expect, which it logs.

| Route                      | What it does                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/health`       | Reports whether the API reaches the database; answers 503 when it does not                                                  |
| `GET /api/v1/notes`        | Lists the notes, newest first                                                                                               |
| `POST /api/v1/notes`       | Creates a note from `{"body": "..."}` and answers 201 with it, or 400 when the body is empty or longer than 1000 characters |
| `PATCH /api/v1/notes/:id`  | Replaces a note's body, under the same rules; 404 for an unknown id                                                         |
| `DELETE /api/v1/notes/:id` | Deletes a note and answers 204; 404 for an unknown id                                                                       |

```sh
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/notes
curl -X POST http://localhost:4000/api/v1/notes -H 'content-type: application/json' -d '{"body":"Hello World"}'
```

## Where the code lives

The notes page is a worked example of the whole path, from the database to the components.

| Layer                                      | Where                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| Table and migrations                       | `orchardsquid-k93-server/src/schema.ts` and `orchardsquid-k93-server/drizzle`       |
| Routes                                     | `orchardsquid-k93-server/src/notes.ts`, mounted in `src/index.ts`                   |
| Error responses                            | `orchardsquid-k93-server/src/errors.ts`                                             |
| Server environment                         | `orchardsquid-k93-server/src/serverEnv.ts`, parsed with Zod when the API starts     |
| Schemas and types                          | `orchardsquid-k93-shared/src/notes.ts` and `src/health.ts`                          |
| API client                                 | `orchardsquid-k93-shared/src/apiClient.ts`                                          |
| Form logic                                 | `orchardsquid-k93-shared/src/noteActions.ts`                                        |
| Components and theme                       | `orchardsquid-k93-ui/src`                                                           |
| Web page, data loading, and server actions | `orchardsquid-k93-web/app/page.tsx`, `app/_components`, and `app/_actions/notes.ts` |

## Shared components

`orchardsquid-k93-ui` holds the components that look and behave the same wherever they are shown. An app only decides what data they get and what happens when they are used.

- **Props only.** Components take their data and their actions as props. They never fetch, read the environment, or import a framework, and ESLint refuses `next` and `node:` imports in the package.
- **Logic sits beside the schemas.** In `orchardsquid-k93-shared`, `submitNewNote`, `submitNoteEdit`, and `submitNoteDelete` parse the input, call the API, and return failures as values, and `createApiClient` builds the client that each app gives its API address. The package runs in Node.js and in browser windows alike, so ESLint refuses browser-only globals there.
- **The web app supplies data from the server.** `app/_components/Notes.tsx` loads the notes in a server component and passes the server actions in `app/_actions/notes.ts`, which refresh the page after a change. The rules for a note stay in the API.
- **The desktop app supplies data from the window.** `orchardsquid-k93-desktop/src/renderer/Notes.tsx` fetches the notes itself and passes functions that call the API directly.
- **`"use client"` where needed.** Components with state or event handlers start with it, which lets the App Router render them from server components. The others have no directive, so they can render on the server as well.
- **One theme.** `src/theme.css` is the one place for colors and fonts, and it tells Tailwind to scan the package for class names. Each app's `globals.css` imports it after `tailwindcss` and provides the fonts behind `--font-geist-sans` and `--font-geist-mono` in its own way.
- **No build step.** The apps compile the package from source, as they do `@orchardsquid-k93/shared`, so an edit hot-reloads in every app that is running.
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
- **`allowScripts` in `package.json`** is npm's install-script policy and names the packages whose install scripts may run. When `npm install` reports an unreviewed package, look at what its script does and approve it. `prune` drops the entries that an update has made unnecessary.

  ```sh
  npm install-scripts approve <package>
  npm install-scripts prune
  ```

- **`.npmrc` sets `engine-strict`**, so `npm install` stops on a Node.js older than 26.

## Debugging

`.vscode/launch.json` starts the API or an app under the VS Code debugger from Run and Debug. Breakpoints in the TypeScript sources bind in the Node.js processes, such as the API and the Next.js server; code that runs in a browser window is debugged with the window's developer tools.

## Desktop app

`orchardsquid-k93-desktop` is an Electron app that shows the same page as the web app, built from the same components. Its window is a React app compiled by Vite that calls the API directly: the server that sits between the web app and the API is there for caching and search engines, which a desktop app has no use for. The main process owns the window and its security rules, and answers the window over a small typed bridge.

```text
window (React, sandboxed) → API
window → window.bridge → preload script → IPC → main process
```

### Commands

```sh
npm run dev:server      # the window shows data only while the API runs
npm run dev:desktop     # starts the app; press r in this terminal to restart the main process
npm run test:desktop    # runs its tests alone
npm run build:desktop   # packages an unsigned app for this machine
npm run make:desktop    # packages it and zips it
```

`npm run preflight` packages the app after the web build, and CI packages it in a job of its own. Arguments for Electron Forge go to the workspace's scripts:

```sh
npm run dev --workspace orchardsquid-k93-desktop -- --inspect-electron   # main process under a debugger
npm run make --workspace orchardsquid-k93-desktop -- --arch x64          # another architecture
VITE_API_BASE_URL=https://api.example.com npm run make:desktop   # a release that calls the production API
```

### Files

Paths are inside `orchardsquid-k93-desktop`.

| File                                         | What it holds                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/renderer/api.ts`                        | The shared API client, pointed at `VITE_API_BASE_URL`                                                                            |
| `src/renderer/Notes.tsx`, `StatusChecks.tsx` | Load the data and hand it to the shared components                                                                               |
| `src/env.ts`                                 | The environment, parsed with Zod when the app starts                                                                             |
| `src/bridge.ts`                              | The `Bridge` interface, which lists every call the window can make to the main process; the two files below are typed against it |
| `src/preload/index.ts`                       | Exposes one function per `Bridge` method as `window.bridge`, and nothing else                                                    |
| `src/main/handlers.ts`                       | Implements each method                                                                                                           |
| `src/main/index.ts`                          | The window, and the security rules listed below                                                                                  |
| `forge.config.ts`                            | Electron Forge: packaging, the Vite builds, and the fuses                                                                        |

The bridge is for what only the main process can do, such as the app version it reports today. To add a call, add it to `Bridge`. TypeScript then fails until the preload script exposes it and `handlers.ts` implements it.

### Configuration

- **`VITE_API_BASE_URL`** in `orchardsquid-k93-desktop/.env` is compiled into the app. A release build needs the production address in the environment or in `.env.production`, and packaging fails without a valid one. CI packages with a local address, only to prove that the app builds.
- **`EXTRA_ALLOWED_ORIGINS`** in `orchardsquid-k93-server/.env` lists where the window is served from, because the API answers only the origins it knows: `http://localhost:5173` for the dev server and `app://renderer` for the packaged app. The server reduces each entry to the origin a browser sends, so a trailing slash or capital letters do no harm.
- **Shipping.** `npm run build:desktop` produces an unsigned app with the default icon. Signing, notarization, installers, an icon, a bundle identifier of your own, and updates are all [Electron Forge](https://www.electronforge.io) configuration, to add in `forge.config.ts` when the app ships.

### Development

- **Forge and Vite.** Electron Forge runs development, packaging, and distribution, and its Vite plugin bundles from `vite.main.config.ts`, `vite.preload.config.ts`, and `vite.renderer.config.ts`. Forge emits the first two as CommonJS, because a sandboxed preload script cannot load ES modules.
- **Reloading.** The window hot-reloads, including after an edit to `orchardsquid-k93-shared` or `orchardsquid-k93-ui`, and a change to the preload script reloads it. A change to the main process is rebuilt at once but takes effect when the app restarts: press `r` in the terminal that runs `npm run dev:desktop`, or type `rs` and Enter where that terminal is not interactive. Forge's `hotRestart` option is meant to do this by itself but does not restart the app as of Forge 8.0.1; turn it on in `forge.config.ts` once it does.
- **Port 5173.** The dev server is fixed to it, because that address is on the API's list.
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
- **Content-Security-Policy.** The page may load its own files, connect to the API's address, and show `data:` images, with no plugins, `<base>` element, or form posts, and with inline scripts and styles allowed only for Vite's dev server. `src/contentSecurityPolicy.ts` builds the policy, Vite's dev server sends it in development, and the `app://` handler sends it with every file of a packaged app.
- **Navigation.** Leaving the app and opening new windows are refused, and `https` addresses, whether from a link or `window.open`, open in the default browser.
- **Permissions** are refused, both when the page asks for one and when Chromium only checks it, except writing to the clipboard and going fullscreen. Add to `grantedPermissions` in `src/main/index.ts` as the app needs more.
- **Zod without `eval`.** `src/renderer/zod.ts` runs first and switches Zod to interpreting its schemas, because the compiled parsers it prefers need `eval`, which the policy forbids. The main process has no such policy and keeps the compiled parsers.
- **Fuses.** The fuses in `forge.config.ts` are flipped when the app is packaged. They stop the binary from running as plain Node.js or taking debugger and `NODE_OPTIONS` flags, and make it load code only from `app.asar`. On macOS and Windows it also verifies that archive before loading it; Electron has no such check on Linux.
