import {
  Button,
  Detail,
  DetailList,
  Page,
  Panel,
  PanelNote,
  StatusList,
  StatusRow,
} from "@orchardsquid-k93/ui";
import { Suspense, use, useState, useTransition } from "react";

import type {
  Connection,
  IpadBatteryHealth,
  IpadReport,
  IpadSystem,
  Transport,
} from "@/bridge.ts";
import { BatteryDetails } from "@/renderer/dashboard/BatteryDetails.tsx";
import { CrashReportDetails } from "@/renderer/dashboard/CrashReportDetails.tsx";
import { NetworkDetails } from "@/renderer/dashboard/NetworkDetails.tsx";
import { ProcessDetails } from "@/renderer/dashboard/ProcessDetails.tsx";
import { SystemDetails } from "@/renderer/dashboard/SystemDetails.tsx";
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
import { transportNames } from "@/unreachable.ts";

type IpadCheck =
  IpadReport | { state: "failed"; connection: Connection | null };

type SystemCheck = Check<IpadSystem>;

interface Checks {
  connection: Promise<Connection | null>;
  version: Promise<string | null>;
  ipad: Promise<IpadCheck>;
  system: Promise<SystemCheck>;
  batteryHealth: Promise<IpadBatteryHealth | null>;
}

async function loadAppVersion(): Promise<string | null> {
  try {
    return await window.bridge.getAppVersion();
  } catch (error) {
    console.error("Electron main process check failed", error);
    return null;
  }
}

async function loadIpad(connection: Connection | null): Promise<IpadCheck> {
  try {
    return await window.bridge.findIpad();
  } catch (error) {
    console.error("iPad check failed", error);
    return { state: "failed", connection };
  }
}

async function loadSystem(): Promise<SystemCheck> {
  try {
    const report = await window.bridge.readIpadSystem();
    return report.state === "ok"
      ? { state: "ok", reading: report.system }
      : report;
  } catch (error) {
    console.error("iPad system report failed", error);
    return { state: "failed" };
  }
}

async function loadBatteryHealth(): Promise<IpadBatteryHealth | null> {
  try {
    return await window.bridge.readIpadBatteryHealth();
  } catch (error) {
    console.error("iPad battery health check failed", error);
    return null;
  }
}

function loadChecks(transport?: Transport): Checks {
  const connection = loadConnection(transport);
  return {
    connection,
    version: loadAppVersion(),
    ipad: connection.then(loadIpad),
    system: connection.then(() => loadSystem()),
    batteryHealth: connection.then(() => loadBatteryHealth()),
  };
}

function overTransport(connection: Connection | null): string {
  return connection ? ` over ${transportNames[connection.transport]}` : "";
}

function IpadDetails({ check }: { check: Promise<IpadCheck> }) {
  const loaded = use(check);
  if (loaded.state === "unreachable") {
    return <UnreachableNote connection={loaded.connection} />;
  }
  if (loaded.state === "signed-out") {
    return <PanelNote>{signedOutExplanation}</PanelNote>;
  }
  if (loaded.state !== "ok") {
    return (
      <PanelNote>{`The iPad did not answer${overTransport(loaded.connection)}.`}</PanelNote>
    );
  }
  const { ipad } = loaded;
  return (
    <DetailList>
      <Detail label="Name">{ipad.name}</Detail>
      <Detail label="Model">
        {ipad.productType} ({ipad.hardwareModel})
      </Detail>
      <Detail label="iOS">
        {ipad.productVersion} ({ipad.buildVersion})
      </Detail>
      <Detail label="Wi-Fi MAC">
        <span className="font-mono">{ipad.wifiAddress ?? "Unknown"}</span>
      </Detail>
      <Detail label="Identifier">
        {ipad.udid ? (
          <span className="font-mono text-xs">{ipad.udid}</span>
        ) : (
          "Not readable over Wi-Fi. Switch to USB to read it."
        )}
      </Detail>
    </DetailList>
  );
}

function MainProcessStatus({ version }: { version: Promise<string | null> }) {
  const loaded = use(version);
  return loaded ? (
    <StatusRow label="Electron main" state="ok" detail={`Version ${loaded}`} />
  ) : (
    <StatusRow label="Electron main" state="error" />
  );
}

function IpadStatus({ check }: { check: Promise<IpadCheck> }) {
  const loaded = use(check);
  if (loaded.state === "ok") {
    return (
      <StatusRow
        label="iPad"
        state="ok"
        detail={`Connected${overTransport(loaded.connection)}`}
      />
    );
  }
  return (
    <StatusRow
      label="iPad"
      state="error"
      {...(loaded.state === "unreachable" && {
        detail: `Not reachable${overTransport(loaded.connection)}`,
      })}
      {...(loaded.state === "signed-out" && { detail: "Key not accepted" })}
    />
  );
}

function SshStatus({ check }: { check: Promise<SystemCheck> }) {
  const { state } = use(check);
  return state === "ok" ? (
    <StatusRow label="SSH" state="ok" detail="Signed in as root" />
  ) : (
    <StatusRow
      label="SSH"
      state="error"
      {...(state === "signed-out" && { detail: "Key not accepted" })}
    />
  );
}

export function Dashboard() {
  const [checks, setChecks] = useState(() => loadChecks());
  const [isRefreshing, startRefresh] = useTransition();
  const refresh = (transport?: Transport) => {
    startRefresh(() => {
      setChecks(loadChecks(transport));
    });
  };

  return (
    <Page
      title="Dashboard"
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
      <div className="grid items-start gap-6 @2xl:grid-cols-2">
        <div className="grid min-w-0 gap-6">
          <Panel title="iPad">
            <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
              <IpadDetails check={checks.ipad} />
            </Suspense>
          </Panel>
          <Panel title="Status">
            <StatusList>
              <Suspense
                fallback={<StatusRow label="Electron main" state="checking" />}
              >
                <MainProcessStatus version={checks.version} />
              </Suspense>
              <Suspense fallback={<StatusRow label="iPad" state="checking" />}>
                <IpadStatus check={checks.ipad} />
              </Suspense>
              <Suspense fallback={<StatusRow label="SSH" state="checking" />}>
                <SshStatus check={checks.system} />
              </Suspense>
            </StatusList>
          </Panel>
          <ReportPanel title="Battery" check={checks.system}>
            {(system) => (
              <BatteryDetails system={system} health={checks.batteryHealth} />
            )}
          </ReportPanel>
          <ReportPanel title="Crash reports" check={checks.system}>
            {(system) => <CrashReportDetails system={system} />}
          </ReportPanel>
        </div>
        <div className="grid min-w-0 gap-6">
          <ReportPanel title="System" check={checks.system} explains>
            {(system) => (
              <SystemDetails
                system={system}
                onCleanedUp={() => {
                  refresh();
                }}
              />
            )}
          </ReportPanel>
          <ReportPanel title="Top processes" check={checks.system}>
            {(system) => <ProcessDetails system={system} />}
          </ReportPanel>
          <ReportPanel title="Network" check={checks.system}>
            {(system) => <NetworkDetails system={system} />}
          </ReportPanel>
        </div>
      </div>
    </Page>
  );
}
