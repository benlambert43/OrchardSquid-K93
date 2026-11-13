import { Button, Page } from "@orchardsquid-k93/ui";
import { useState, useTransition } from "react";

import type { IpadSoftware } from "@/bridge.ts";
import { type Check, ReportPanel } from "@/renderer/ReportPanel.tsx";
import { PackageTable } from "@/renderer/software/PackageTable.tsx";
import { SoftwareDetails } from "@/renderer/software/SoftwareDetails.tsx";

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

export function Software() {
  const [check, setCheck] = useState(loadSoftware);
  const [isRefreshing, startRefresh] = useTransition();

  return (
    <Page
      title="Software"
      actions={
        <Button
          disabled={isRefreshing}
          onClick={() => {
            startRefresh(() => {
              setCheck(loadSoftware());
            });
          }}
        >
          Refresh
        </Button>
      }
    >
      <div className="grid max-w-3xl gap-6">
        <ReportPanel title="Overview" check={check} explains>
          {(software) => <SoftwareDetails software={software} />}
        </ReportPanel>
        <ReportPanel title="Installed packages" check={check}>
          {(software) => <PackageTable software={software} />}
        </ReportPanel>
      </div>
    </Page>
  );
}
