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

import type { Ipad, IpadBatteryHealth, IpadSystem } from "@/bridge.ts";
import { BatteryDetails } from "@/renderer/dashboard/BatteryDetails.tsx";
import { CrashReportDetails } from "@/renderer/dashboard/CrashReportDetails.tsx";
import { NetworkDetails } from "@/renderer/dashboard/NetworkDetails.tsx";
import { ProcessDetails } from "@/renderer/dashboard/ProcessDetails.tsx";
import { SystemDetails } from "@/renderer/dashboard/SystemDetails.tsx";
import { type Check, ReportPanel } from "@/renderer/ReportPanel.tsx";

type IpadCheck =
  | { state: "connected"; ipad: Ipad }
  | { state: "unplugged" }
  | { state: "failed" };

type SystemCheck = Check<IpadSystem>;

interface Checks {
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

async function loadIpad(): Promise<IpadCheck> {
  try {
    const ipad = await window.bridge.findIpad();
    return ipad ? { state: "connected", ipad } : { state: "unplugged" };
  } catch (error) {
    console.error("iPad check failed", error);
    return { state: "failed" };
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

function loadChecks(): Checks {
  return {
    version: loadAppVersion(),
    ipad: loadIpad(),
    system: loadSystem(),
    batteryHealth: loadBatteryHealth(),
  };
}

function IpadDetails({ check }: { check: Promise<IpadCheck> }) {
  const loaded = use(check);
  if (loaded.state !== "connected") {
    return (
      <PanelNote>
        {loaded.state === "unplugged"
          ? "Connect the iPad 2 with its USB cable."
          : "The iPad did not answer over USB."}
      </PanelNote>
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
      <Detail label="Wi-Fi address">
        <span className="font-mono">{ipad.wifiAddress}</span>
      </Detail>
      <Detail label="Identifier">
        <span className="font-mono text-xs">{ipad.udid}</span>
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
  const { state } = use(check);
  return state === "connected" ? (
    <StatusRow label="iPad" state="ok" detail="Connected over USB" />
  ) : (
    <StatusRow
      label="iPad"
      state="error"
      {...(state === "unplugged" && { detail: "Not connected over USB" })}
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
  const [checks, setChecks] = useState(loadChecks);
  const [isRefreshing, startRefresh] = useTransition();

  return (
    <Page
      title="Dashboard"
      actions={
        <Button
          disabled={isRefreshing}
          onClick={() => {
            startRefresh(() => {
              setChecks(loadChecks());
            });
          }}
        >
          Refresh
        </Button>
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
            {(system) => <SystemDetails system={system} />}
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
