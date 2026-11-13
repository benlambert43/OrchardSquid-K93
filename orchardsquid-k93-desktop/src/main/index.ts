import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  net,
  protocol,
  session,
  shell,
} from "electron";

import { contentSecurityPolicy } from "@/contentSecurityPolicy.ts";
import { env } from "@/env.ts";
import { handlers } from "@/main/handlers.ts";

// Security model. The window is treated as untrusted: it shows data from the
// API, so everything it can reach is decided here and nothing is left to the
// page. Each rule below closes one way out of that; change them together.
//
// - Sandbox: app.enableSandbox() sandboxes every renderer, and context
//   isolation stays on, so the page has no Node.js or Electron APIs. The
//   preload script exposes only the named functions of Bridge, never
//   ipcRenderer itself.
// - IPC: every handler checks that the calling frame is the app's own page
//   (isRenderer) before it runs, so an embedded or navigated-to page cannot
//   call the main process.
// - Origin: a packaged app is served from app://renderer, a privileged
//   standard scheme, because file:// pages have no origin for the API's CORS
//   list or the Content-Security-Policy to refer to. serveRendererFile only
//   answers for that host and only with files inside the renderer folder; the
//   startsWith check is what stops ../ paths from reading the rest of the disk.
// - Content-Security-Policy: sent with every file by serveRendererFile, and by
//   Vite's dev server in development. It limits the page to its own files and
//   the API's origin, with no inline or evaluated script in a packaged app
//   (src/contentSecurityPolicy.ts).
// - Navigation: will-navigate and the window-open handler keep the window on
//   the app's own page. Anything else is refused, and only https addresses are
//   handed to the default browser, so a link cannot launch another program
//   through a custom scheme or open a local file.
// - Permissions: both the request and the check handler refuse everything not
//   in grantedPermissions, so the page cannot get the camera, microphone,
//   location or notifications by asking.
// - Binary: the fuses in forge.config.ts stop a packaged app from being run as
//   plain Node.js, taking NODE_OPTIONS or debugger flags, or loading code from
//   outside app.asar.

const devServerUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL as string | undefined;
const renderer = new URL(devServerUrl ?? "app://renderer");

const preload = path.join(__dirname, "preload.cjs");
const rendererFiles = path.join(
  __dirname,
  "../renderer",
  MAIN_WINDOW_VITE_NAME,
);

const policy = contentSecurityPolicy(env.VITE_API_BASE_URL, {
  devServer: false,
});

const grantedPermissions = new Set(["clipboard-sanitized-write", "fullscreen"]);

function isRenderer(url = ""): boolean {
  const target = URL.parse(url);
  return (
    target?.protocol === renderer.protocol && target.host === renderer.host
  );
}

function decodePath(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

async function serveRendererFile(request: Request): Promise<Response> {
  const { host, pathname } = new URL(request.url);
  const decoded = decodePath(pathname);
  if (decoded === null) {
    return new Response(null, { status: 400 });
  }
  const file = path.join(rendererFiles, decoded);
  if (host !== renderer.host || !file.startsWith(rendererFiles + path.sep)) {
    return new Response(null, { status: 404 });
  }
  const response = await net.fetch(pathToFileURL(file).href).catch(() => null);
  if (!response) {
    return new Response(null, { status: 404 });
  }
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", policy);
  return new Response(response.body, { status: response.status, headers });
}

function openInBrowser(url: string): void {
  if (URL.parse(url)?.protocol === "https:") {
    shell.openExternal(url).catch((error: unknown) => {
      console.error(`Could not open ${url}`, error);
    });
  }
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 960,
    height: 720,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0a0a0a" : "#ffffff",
    webPreferences: {
      preload,
      v8CacheOptions: "bypassHeatCheck",
    },
  });
  void window.loadURL(new URL("/index.html", renderer).href);
}

function showWindow(): void {
  const [window] = BrowserWindow.getAllWindows();
  if (!window) {
    createWindow();
    return;
  }
  if (window.isMinimized()) {
    window.restore();
  }
  window.focus();
}

function start(): void {
  if (!devServerUrl) {
    protocol.handle("app", serveRendererFile);
  }

  session.defaultSession.setPermissionRequestHandler(
    (_contents, permission, callback) => {
      callback(grantedPermissions.has(permission));
    },
  );
  session.defaultSession.setPermissionCheckHandler((_contents, permission) =>
    grantedPermissions.has(permission),
  );

  for (const [method, handler] of Object.entries(handlers)) {
    ipcMain.handle(method, (event, ...args: unknown[]) => {
      if (!isRenderer(event.senderFrame?.url)) {
        throw new Error(`Refused ${method} from an unexpected sender`);
      }
      return handler(...args);
    });
  }

  createWindow();
  app.on("activate", showWindow);
  app.on("second-instance", showWindow);
}

if (devServerUrl) {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

app.enableSandbox();

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      codeCache: true,
    },
  },
]);

app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event) => {
    if (!isRenderer(event.url)) {
      event.preventDefault();
      openInBrowser(event.url);
    }
  });
  contents.setWindowOpenHandler(({ url }) => {
    openInBrowser(url);
    return { action: "deny" };
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

if (app.requestSingleInstanceLock()) {
  void app.whenReady().then(start);
} else {
  app.quit();
}
