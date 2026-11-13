import { Detail, DetailList, DetailNote } from "@orchardsquid-k93/ui";

import type { IpadSystem } from "@/bridge.ts";
import { Unavailable } from "@/renderer/dashboard/Unavailable.tsx";
import { formatDateTime } from "@/renderer/format.ts";

export function CrashReportDetails({ system }: { system: IpadSystem }) {
  const { crashReports } = system;
  if (!crashReports) {
    return <Unavailable />;
  }
  const { latestCrash, latestMemoryEvent } = crashReports;
  return (
    <DetailList>
      <Detail label="Crashes">{crashReports.crashes}</Detail>
      {latestCrash && (
        <Detail label="Latest crash">
          {latestCrash.process ?? "Unknown process"}
          <DetailNote>{formatDateTime(latestCrash.time)}</DetailNote>
        </Detail>
      )}
      <Detail label="Out-of-memory events">{crashReports.memoryEvents}</Detail>
      {latestMemoryEvent !== null && (
        <Detail label="Latest event">
          {formatDateTime(latestMemoryEvent)}
        </Detail>
      )}
    </DetailList>
  );
}
