import { Button, Page } from "@orchardsquid-k93/ui";
import { useActionState, useOptimistic, useState, useTransition } from "react";

import type { AppAction } from "@/appActions.ts";
import type {
  Connection,
  IpadApp,
  IpadAppChangeReport,
  Transport,
} from "@/bridge.ts";
import { type AppRequest, AppTable } from "@/renderer/apps/AppTable.tsx";
import {
  type Check,
  ReportPanel,
  signedOutExplanation,
} from "@/renderer/ReportPanel.tsx";
import {
  loadConnection,
  TransportPicker,
} from "@/renderer/TransportPicker.tsx";
import { UnreachableNote } from "@/renderer/UnreachableNote.tsx";

type Outcome = {
  request: AppRequest;
  report: IpadAppChangeReport | { state: "failed" };
} | null;

const underway: Record<AppAction, string> = {
  remove: "Removing",
  restore: "Restoring",
  uninstall: "Uninstalling",
};

const finished: Record<AppAction, string> = {
  remove: "was removed and is kept in the stash",
  restore: "is back on the Home screen",
  uninstall: "was uninstalled",
};

const handled: Record<AppAction, string> = {
  remove: "Set aside with it:",
  restore: "Put back with it:",
  uninstall: "Deleted with it:",
};

const listFormat = new Intl.ListFormat(undefined, { type: "conjunction" });

function count(amount: number, thing: string): string[] {
  return amount > 0
    ? [`${String(amount)} ${thing}${amount === 1 ? "" : "s"}`]
    : [];
}

function describeReferences(
  action: AppAction,
  links: number,
  services: number,
): string {
  const references = [
    ...count(links, "link"),
    ...count(services, "launch daemon"),
  ];
  return references.length > 0
    ? ` ${handled[action]} ${listFormat.format(references)}.`
    : "";
}

async function loadApps(): Promise<Check<IpadApp[]>> {
  try {
    const report = await window.bridge.readIpadApps();
    return report.state === "ok"
      ? { state: "ok", reading: report.apps }
      : report;
  } catch (error) {
    console.error("iPad app list failed", error);
    return { state: "failed" };
  }
}

interface Checks {
  connection: Promise<Connection | null>;
  apps: Promise<Check<IpadApp[]>>;
}

function loadChecks(transport?: Transport): Checks {
  const connection = loadConnection(transport);
  return { connection, apps: connection.then(() => loadApps()) };
}

function Status({
  pending,
  outcome,
}: {
  pending: AppRequest | null;
  outcome: Outcome;
}) {
  if (pending) {
    return (
      <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
        {underway[pending.action]} {pending.app.name}…
      </p>
    );
  }
  if (outcome === null) {
    return null;
  }
  const { request, report } = outcome;
  if (report.state === "unreachable") {
    return <UnreachableNote connection={report.connection} />;
  }
  if (report.state === "changed") {
    return (
      <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
        {request.app.name} {finished[request.action]}.
        {describeReferences(request.action, report.links, report.services)}
        {!report.homeScreenRefreshed &&
          " The Home screen was not refreshed, so restart the iPad to see the change."}
      </p>
    );
  }
  return (
    <div role="status" className="text-sm text-red-600 dark:text-red-400">
      {report.state === "signed-out" && signedOutExplanation}
      {report.state === "failed" && `${request.app.name} could not be changed.`}
      {report.state === "missing" &&
        `${request.app.name} is no longer where the list showed it. Refresh the list and try again.`}
      {report.state === "refused" && (
        <>
          The iPad did not finish that for {request.app.name}:
          <pre
            className="mt-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5 font-mono
              text-xs whitespace-pre-wrap dark:bg-zinc-900"
          >
            {report.output}
          </pre>
        </>
      )}
    </div>
  );
}

export function Apps() {
  const [checks, setChecks] = useState(() => loadChecks());
  const [isRefreshing, startRefresh] = useTransition();
  const reload = (transport?: Transport): Checks => {
    const next = loadChecks(transport);
    startRefresh(() => {
      setChecks(next);
    });
    return next;
  };
  const refresh = (transport?: Transport) => {
    reload(transport);
  };
  const [outcome, change, isBusy] = useActionState(
    async (_previous: Outcome, request: AppRequest): Promise<Outcome> => {
      try {
        const report = await window.bridge.changeIpadApp(
          request.app.id,
          request.action,
        );
        if (report.state === "changed") {
          await reload().apps;
        }
        return { request, report };
      } catch (error) {
        console.error("The app could not be changed", error);
        return { request, report: { state: "failed" } };
      }
    },
    null,
  );
  const [pending, setPending] = useOptimistic<AppRequest | null>(null);
  const request = (next: AppRequest) => {
    setPending(next);
    change(next);
  };
  const disabled = isBusy || isRefreshing;

  return (
    <Page
      title="App Management"
      actions={
        <div className="flex gap-2">
          <TransportPicker
            connection={checks.connection}
            disabled={disabled}
            onChoose={refresh}
          />
          <Button
            disabled={disabled}
            onClick={() => {
              refresh();
            }}
          >
            Refresh
          </Button>
        </div>
      }
    >
      <div className="grid max-w-3xl gap-6">
        <Status pending={pending} outcome={outcome} />
        <ReportPanel title="On the Home screen" check={checks.apps} explains>
          {(apps) => (
            <AppTable
              apps={apps.filter(({ removed }) => !removed)}
              empty="No app is on the Home screen."
              disabled={disabled}
              onRequest={request}
            />
          )}
        </ReportPanel>
        <ReportPanel title="Removed" check={checks.apps}>
          {(apps) => (
            <AppTable
              apps={apps.filter(({ removed }) => removed)}
              empty="No app has been removed."
              disabled={disabled}
              onRequest={request}
            />
          )}
        </ReportPanel>
      </div>
    </Page>
  );
}
