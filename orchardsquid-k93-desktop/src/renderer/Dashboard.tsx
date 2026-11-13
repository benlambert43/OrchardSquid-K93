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
import { type ReactNode, Suspense, use, useState, useTransition } from "react";

import type {
  Ipad,
  IpadBatteryHealth,
  IpadSystem,
  IpadSystemReport,
} from "@/bridge.ts";
import { BatteryDetails } from "@/renderer/dashboard/BatteryDetails.tsx";
import { CrashReportDetails } from "@/renderer/dashboard/CrashReportDetails.tsx";
import { NetworkDetails } from "@/renderer/dashboard/NetworkDetails.tsx";
import { ProcessDetails } from "@/renderer/dashboard/ProcessDetails.tsx";
import { SoftwareDetails } from "@/renderer/dashboard/SoftwareDetails.tsx";
import { SystemDetails } from "@/renderer/dashboard/SystemDetails.tsx";
import { Unavailable } from "@/renderer/dashboard/Unavailable.tsx";

type IpadCheck =
  | { state: "connected"; ipad: Ipad }
  | { state: "unplugged" }
  | { state: "failed" };

type SystemCheck = IpadSystemReport | { state: "failed" };

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
    return await window.bridge.readIpadSystem();
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

type SystemNotes = Record<Exclude<SystemCheck["state"], "ok">, string>;

const systemNotes: SystemNotes = {
  unplugged: "Connect the iPad 2 with its USB cable.",
  "signed-out":
    "The iPad does not accept this computer's SSH key yet. The README explains how to add it.",
  failed: "The iPad did not answer over SSH.",
};

interface SystemPanelProps {
  title: string;
  check: Promise<SystemCheck>;
  notes?: SystemNotes;
  children: (system: IpadSystem) => ReactNode;
}

function SystemReading({
  check,
  notes,
  children,
}: Omit<SystemPanelProps, "title">) {
  const loaded = use(check);
  if (loaded.state === "ok") {
    return children(loaded.system);
  }
  return notes ? <PanelNote>{notes[loaded.state]}</PanelNote> : <Unavailable />;
}

function SystemPanel({ title, ...reading }: SystemPanelProps) {
  return (
    <Panel title={title}>
      <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
        <SystemReading {...reading} />
      </Suspense>
    </Panel>
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
          <SystemPanel title="Software" check={checks.system}>
            {(system) => <SoftwareDetails system={system} />}
          </SystemPanel>
          <SystemPanel title="Network" check={checks.system}>
            {(system) => <NetworkDetails system={system} />}
          </SystemPanel>
        </div>
        <div className="grid min-w-0 gap-6">
          <SystemPanel title="System" check={checks.system} notes={systemNotes}>
            {(system) => <SystemDetails system={system} />}
          </SystemPanel>
          <SystemPanel title="Top processes" check={checks.system}>
            {(system) => <ProcessDetails system={system} />}
          </SystemPanel>
          <SystemPanel title="Battery" check={checks.system}>
            {(system) => (
              <BatteryDetails system={system} health={checks.batteryHealth} />
            )}
          </SystemPanel>
          <SystemPanel title="Crash reports" check={checks.system}>
            {(system) => <CrashReportDetails system={system} />}
          </SystemPanel>
        </div>
      </div>
    </Page>
  );
}
