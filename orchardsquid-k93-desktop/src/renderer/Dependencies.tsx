import { Button, Page } from "@orchardsquid-k93/ui";
import { Suspense, useState, useTransition } from "react";

import type { Connection, IpadSoftware, Transport } from "@/bridge.ts";
import { type Check, ReportPanel } from "@/renderer/ReportPanel.tsx";
import { AptGetSetup } from "@/renderer/dependencies/AptGetSetup.tsx";
import { DeveloperDependencies } from "@/renderer/dependencies/DeveloperDependencies.tsx";
import { PackageTable } from "@/renderer/dependencies/PackageTable.tsx";
import { SoftwareDetails } from "@/renderer/dependencies/SoftwareDetails.tsx";
import {
  loadConnection,
  TransportPicker,
} from "@/renderer/TransportPicker.tsx";

async function loadSoftware(): Promise<Check<IpadSoftware>> {
  try {
    const report = await window.bridge.readIpadSoftware();
    return report.state === "ok"
      ? { state: "ok", reading: report.software }
      : report;
  } catch (error) {
    console.error("iPad software report failed", error);
    return { state: "failed" };
  }
}

interface Checks {
  connection: Promise<Connection | null>;
  software: Promise<Check<IpadSoftware>>;
}

function loadChecks(transport?: Transport): Checks {
  const connection = loadConnection(transport);
  return { connection, software: connection.then(() => loadSoftware()) };
}

export function Dependencies() {
  const [checks, setChecks] = useState(() => loadChecks());
  const [isRefreshing, startRefresh] = useTransition();
  const refresh = (transport?: Transport) => {
    startRefresh(() => {
      setChecks(loadChecks(transport));
    });
  };
  const check = checks.software;

  return (
    <Page
      title="Dependencies"
      actions={
        <div className="flex gap-2">
          <TransportPicker
            connection={checks.connection}
            disabled={isRefreshing}
            onChoose={refresh}
          />
          <Button
            disabled={isRefreshing}
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
        <Suspense fallback={null}>
          <AptGetSetup check={check} />
        </Suspense>
        <ReportPanel title="Developer Dependencies" check={check} explains>
          {(software) => <DeveloperDependencies software={software} />}
        </ReportPanel>
        <ReportPanel title="Overview" check={check}>
          {(software) => <SoftwareDetails software={software} />}
        </ReportPanel>
        <ReportPanel title="Installed packages" check={check}>
          {(software) => <PackageTable software={software} />}
        </ReportPanel>
      </div>
    </Page>
  );
}
