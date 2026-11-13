import { Button, Page, Panel, PanelNote } from "@orchardsquid-k93/ui";
import { Suspense, use, useState, useTransition } from "react";

import type {
  Connection,
  IpadDevelopment,
  LaptopToolchain,
  ProjectReading,
  Transport,
} from "@/bridge.ts";
import { BuildAndShip } from "@/renderer/development/BuildAndShip.tsx";
import { IpadTools, isIpadReady } from "@/renderer/development/IpadTools.tsx";
import { useDevelopmentProgress } from "@/renderer/development/progress.ts";
import { Requirements } from "@/renderer/development/Requirements.tsx";
import {
  isToolchainReady,
  Toolchain,
} from "@/renderer/development/Toolchain.tsx";
import {
  type TunnelReading,
  UsbTunnel,
} from "@/renderer/development/UsbTunnel.tsx";
import { type Check, ReportPanel } from "@/renderer/ReportPanel.tsx";
import {
  loadConnection,
  TransportPicker,
} from "@/renderer/TransportPicker.tsx";

interface Checks {
  connection: Promise<Connection | null>;
  laptop: Promise<LaptopToolchain | null>;
  ipad: Promise<Check<IpadDevelopment>>;
  tunnel: Promise<TunnelReading | null>;
  project: Promise<ProjectReading | null>;
}

interface Reloads {
  disabled: boolean;
  onInstalled: () => Promise<unknown>;
  onTunnelChanged: () => Promise<unknown>;
  onProjectChanged: () => Promise<unknown>;
}

async function loadToolchain(): Promise<LaptopToolchain | null> {
  try {
    return await window.bridge.readLaptopToolchain();
  } catch (error) {
    console.error("Laptop toolchain check failed", error);
    return null;
  }
}

async function loadIpad(): Promise<Check<IpadDevelopment>> {
  try {
    const report = await window.bridge.readIpadDevelopment();
    return report.state === "ok"
      ? { state: "ok", reading: report.development }
      : report;
  } catch (error) {
    console.error("iPad development report failed", error);
    return { state: "failed" };
  }
}

async function loadTunnel(): Promise<TunnelReading | null> {
  try {
    const [tunnel, host] = await Promise.all([
      window.bridge.readUsbTunnel(),
      window.bridge.readSshHost(),
    ]);
    return { tunnel, host };
  } catch (error) {
    console.error("USB tunnel check failed", error);
    return null;
  }
}

async function loadProject(): Promise<ProjectReading | null> {
  try {
    return await window.bridge.readDevelopmentProject();
  } catch (error) {
    console.error("Development project check failed", error);
    return null;
  }
}

function loadChecks(transport?: Transport): Checks {
  const connection = loadConnection(transport);
  return {
    connection,
    laptop: loadToolchain(),
    ipad: connection.then(() => loadIpad()),
    tunnel: loadTunnel(),
    project: loadProject(),
  };
}

function Tunnel({
  check,
  disabled,
  onChanged,
}: {
  check: Checks["tunnel"];
  disabled: boolean;
  onChanged: () => Promise<unknown>;
}) {
  const reading = use(check);
  return reading ? (
    <UsbTunnel reading={reading} disabled={disabled} onChanged={onChanged} />
  ) : (
    <PanelNote>The USB tunnel could not be checked.</PanelNote>
  );
}

function Panels({
  checks,
  disabled,
  onInstalled,
  onTunnelChanged,
  onProjectChanged,
}: Reloads & { checks: Checks }) {
  const toolchain = use(checks.laptop);
  const ipad = use(checks.ipad);
  const requirements = [
    {
      name: "This Mac",
      met: toolchain !== null && isToolchainReady(toolchain),
      panel: (
        <Panel key="laptop" title="This Mac">
          {toolchain ? (
            <Toolchain
              toolchain={toolchain}
              disabled={disabled}
              onInstalled={onInstalled}
            />
          ) : (
            <PanelNote>This Mac&apos;s tools could not be checked.</PanelNote>
          )}
        </Panel>
      ),
    },
    {
      name: "iPad",
      met: ipad.state === "ok" && isIpadReady(ipad.reading),
      panel: (
        <ReportPanel key="ipad" title="iPad" check={checks.ipad} explains>
          {(development) => <IpadTools development={development} />}
        </ReportPanel>
      ),
    },
  ];
  const met = requirements.filter((requirement) => requirement.met);
  const unmet = requirements.filter((requirement) => !requirement.met);
  const actions = (
    <>
      <Panel title="USB tunnel">
        <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
          <Tunnel
            check={checks.tunnel}
            disabled={disabled}
            onChanged={onTunnelChanged}
          />
        </Suspense>
      </Panel>
      <BuildAndShip
        check={checks.project}
        disabled={disabled}
        onChanged={onProjectChanged}
      />
    </>
  );

  return (
    <>
      {met.length > 0 && (
        <Requirements names={met.map(({ name }) => name)}>
          {met.map(({ panel }) => panel)}
        </Requirements>
      )}
      <div className="grid items-start gap-6 @2xl:grid-cols-2">
        {unmet.length > 0 ? (
          <>
            <div className="grid min-w-0 gap-6">
              {unmet.map(({ panel }) => panel)}
            </div>
            <div className="grid min-w-0 gap-6">{actions}</div>
          </>
        ) : (
          actions
        )}
      </div>
    </>
  );
}

export function Development() {
  const [checks, setChecks] = useState(() => loadChecks());
  const [isRefreshing, startRefresh] = useTransition();
  const progress = useDevelopmentProgress();
  const disabled = isRefreshing || progress !== null;
  const update = (next: Partial<Checks>) => {
    startRefresh(() => {
      setChecks((current) => ({ ...current, ...next }));
    });
  };
  const refresh = (transport?: Transport) => {
    update(loadChecks(transport));
  };
  const reloads: Reloads = {
    disabled,
    onInstalled: () => {
      const laptop = loadToolchain();
      update({ laptop });
      return laptop;
    },
    onTunnelChanged: () => {
      const tunnel = loadTunnel();
      update({ tunnel });
      return tunnel;
    },
    onProjectChanged: () => {
      const project = loadProject();
      update({ project });
      return project;
    },
  };

  return (
    <Page
      title="Development"
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
      <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
        <Panels checks={checks} {...reloads} />
      </Suspense>
    </Page>
  );
}
