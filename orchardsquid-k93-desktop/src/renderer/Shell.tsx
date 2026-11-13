import { Button, Page } from "@orchardsquid-k93/ui";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useId, useRef, useState } from "react";

import type { ShellStatus } from "@/bridge.ts";
import { transportNames } from "@/unreachable.ts";

const background = "#09090b";
const fontFamily = '"Geist Mono Variable", ui-monospace, monospace';
const fontSize = 13;

const indicatorClassNames: Record<ShellStatus["state"], string> = {
  connecting: "animate-pulse bg-zinc-400",
  password: "animate-pulse bg-zinc-400",
  open: "bg-emerald-500",
  closed: "bg-red-500",
};

function describe(status: ShellStatus): string {
  switch (status.state) {
    case "connecting":
      return "Connecting to the iPad…";
    case "password":
      return "Waiting for the password";
    case "open":
      return `Connected as root over ${transportNames[status.transport]}`;
    case "closed":
      return status.reason;
  }
}

function report(error: unknown): void {
  console.error("The shell request failed", error);
}

export function Shell() {
  const host = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const passwordId = useId();
  const [status, setStatus] = useState<ShellStatus>(() =>
    "bridge" in window
      ? { state: "connecting" }
      : { state: "closed", reason: "The shell needs the desktop app." },
  );

  useEffect(() => {
    const element = host.current;
    if (!element || !("bridge" in window)) {
      return;
    }
    const created = new Terminal({
      cursorBlink: true,
      fontFamily,
      fontSize,
      scrollback: 5000,
      theme: { background, foreground: "#ededed", cursor: "#ededed" },
    });
    const fit = new FitAddon();
    created.loadAddon(fit);
    terminal.current = created;
    const cleanups = [
      () => {
        terminal.current = null;
        created.dispose();
      },
    ];
    let mounted = true;

    const open = () => {
      if (!mounted) {
        return;
      }
      created.open(element);
      fit.fit();
      const observer = new ResizeObserver(() => {
        fit.fit();
      });
      observer.observe(element);
      const input = created.onData((data) => {
        window.bridge.writeShell(data).catch(report);
      });
      const resize = created.onResize(({ cols, rows }) => {
        window.bridge.resizeShell({ cols, rows }).catch(report);
      });
      cleanups.push(
        () => {
          observer.disconnect();
          input.dispose();
          resize.dispose();
        },
        window.bridge.onShellStatus((next) => {
          setStatus(next);
          if (next.state === "open") {
            created.focus();
          }
        }),
        window.bridge.onShellReplay((data) => {
          created.reset();
          created.write(data);
        }),
        window.bridge.onShellOutput((data) => {
          created.write(data);
        }),
      );
      window.bridge
        .openShell({ cols: created.cols, rows: created.rows })
        .catch(report);
    };

    document.fonts.load(`${String(fontSize)}px ${fontFamily}`).then(open, open);

    return () => {
      mounted = false;
      for (const cleanup of cleanups.reverse()) {
        cleanup();
      }
    };
  }, []);

  function startSession() {
    const { current } = terminal;
    if (current) {
      window.bridge
        .openShell({ cols: current.cols, rows: current.rows })
        .catch(report);
    }
  }

  async function signIn(formData: FormData) {
    const password = formData.get("password");
    if (typeof password === "string") {
      await window.bridge.submitShellPassword(password).catch(report);
    }
  }

  return (
    <Page
      title="Shell"
      actions={
        <div className="flex items-center gap-3 text-sm">
          <span
            aria-hidden
            className={`size-2.5 shrink-0 rounded-full
            ${indicatorClassNames[status.state]}`}
          />
          <span role="status" className="text-zinc-600 dark:text-zinc-400">
            {describe(status)}
          </span>
          {status.state === "closed" && (
            <Button onClick={startSession}>New session</Button>
          )}
        </div>
      }
    >
      {status.state === "password" && (
        <form
          action={signIn}
          className="flex flex-wrap items-center gap-3 rounded-xl border
            border-zinc-200 p-4 text-sm dark:border-zinc-800"
        >
          <label htmlFor={passwordId} className="font-medium">
            Password for root on the iPad
          </label>
          <input
            ref={(input) => {
              input?.focus();
            }}
            id={passwordId}
            name="password"
            type="password"
            required
            autoComplete="off"
            className="min-w-40 flex-1 rounded-lg border border-zinc-300
              bg-transparent px-3 py-1.5 dark:border-zinc-700"
          />
          <Button type="submit">Sign in</Button>
          {status.retry && (
            <p role="alert" className="w-full text-red-600 dark:text-red-400">
              The iPad did not accept that password.
            </p>
          )}
        </form>
      )}
      <div
        className="min-h-0 flex-1 overflow-hidden rounded-xl border
          border-zinc-200 p-3 dark:border-zinc-800"
        style={{ backgroundColor: background }}
      >
        <div ref={host} className="size-full" />
      </div>
    </Page>
  );
}
