import type { HealthResponse } from "@orchardsquid-k93/shared";
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

import type { Ipad, IpadSystemReport, Usage } from "@/bridge.ts";
import { api } from "@/renderer/api.ts";
import { formatBytes, formatDuration } from "@/renderer/format.ts";

type IpadCheck =
  | { state: "connected"; ipad: Ipad }
  | { state: "unplugged" }
  | { state: "failed" };

type SystemCheck = IpadSystemReport | { state: "failed" };

interface Checks {
  version: Promise<string | null>;
  ipad: Promise<IpadCheck>;
  system: Promise<SystemCheck>;
  health: Promise<HealthResponse | null>;
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

function loadChecks(): Checks {
  return {
    version: loadAppVersion(),
    ipad: loadIpad(),
    system: loadSystem(),
    health: api.getHealth(),
  };
}

function usage({ usedBytes, totalBytes }: Usage): string {
  return `${formatBytes(usedBytes)} of ${formatBytes(totalBytes)}`;
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

const systemNotes: Record<Exclude<SystemCheck["state"], "ok">, string> = {
  unplugged: "Connect the iPad 2 with its USB cable.",
  "signed-out":
    "The iPad does not accept this computer's SSH key yet. The README explains how to add it.",
  failed: "The iPad did not answer over SSH.",
};

function SystemDetails({ check }: { check: Promise<SystemCheck> }) {
  const loaded = use(check);
  if (loaded.state !== "ok") {
    return <PanelNote>{systemNotes[loaded.state]}</PanelNote>;
  }
  const { system } = loaded;
  return (
    <DetailList>
      <Detail label="Uptime">{formatDuration(system.uptimeSeconds)}</Detail>
      <Detail label="Load average">{system.loadAverage.toFixed(2)}</Detail>
      <Detail
        label="Memory"
        meter={system.memory.usedBytes / system.memory.totalBytes}
      >
        {usage(system.memory)}
      </Detail>
      {system.volumes.map((volume) => (
        <Detail
          key={volume.name}
          label={`${volume.name} volume`}
          meter={volume.usedBytes / volume.totalBytes}
        >
          {usage(volume)}
        </Detail>
      ))}
      <Detail label="Processes">{system.processes}</Detail>
      <Detail label="Packages">{system.packages}</Detail>
      <Detail label="Kernel">{system.kernel}</Detail>
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

function ApiStatus({ health }: { health: Promise<HealthResponse | null> }) {
  const loaded = use(health);
  return (
    <>
      <StatusRow label="API" state={loaded ? "ok" : "error"} />
      <StatusRow
        label="Database"
        state={loaded?.database === "ok" ? "ok" : "error"}
        {...(!loaded && { detail: "Unknown: API unreachable" })}
      />
    </>
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
        <Panel title="iPad">
          <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
            <IpadDetails check={checks.ipad} />
          </Suspense>
        </Panel>
        <div className="@2xl:col-start-2 @2xl:row-span-2 @2xl:row-start-1">
          <Panel title="System">
            <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
              <SystemDetails check={checks.system} />
            </Suspense>
          </Panel>
        </div>
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
            <Suspense
              fallback={
                <>
                  <StatusRow label="API" state="checking" />
                  <StatusRow label="Database" state="checking" />
                </>
              }
            >
              <ApiStatus health={checks.health} />
            </Suspense>
          </StatusList>
        </Panel>
      </div>
    </Page>
  );
}
