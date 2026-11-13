import { Button, Page, Panel, PanelNote } from "@orchardsquid-k93/ui";
import { Suspense, use, useState, useTransition } from "react";

import type {
  Connection,
  IpadDevelopment,
  LaptopToolchain,
  Transport,
} from "@/bridge.ts";
import { BuildAndShip } from "@/renderer/development/BuildAndShip.tsx";
import { IpadTools } from "@/renderer/development/IpadTools.tsx";
import { useDevelopmentProgress } from "@/renderer/development/progress.ts";
import { Toolchain } from "@/renderer/development/Toolchain.tsx";
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
  tunnel: Promise<TunnelReading | null>;
  ipad: Promise<Check<IpadDevelopment>>;
}

async function loadToolchain(): Promise<LaptopToolchain | null> {
  try {
    return await window.bridge.readLaptopToolchain();
  } catch (error) {
    console.error("Laptop toolchain check failed", error);
    return null;
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

function loadChecks(transport?: Transport): Checks {
  const connection = loadConnection(transport);
  return {
    connection,
    laptop: loadToolchain(),
    tunnel: loadTunnel(),
    ipad: connection.then(() => loadIpad()),
  };
}

function Laptop({
  check,
  disabled,
  onInstalled,
}: {
  check: Checks["laptop"];
  disabled: boolean;
  onInstalled: () => Promise<unknown>;
}) {
  const toolchain = use(check);
  return toolchain ? (
    <Toolchain
      toolchain={toolchain}
      disabled={disabled}
      onInstalled={onInstalled}
    />
  ) : (
    <PanelNote>This Mac&apos;s tools could not be checked.</PanelNote>
  );
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
  const reloadLaptop = () => {
    const laptop = loadToolchain();
    update({ laptop });
    return laptop;
  };
  const reloadTunnel = () => {
    const tunnel = loadTunnel();
    update({ tunnel });
    return tunnel;
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
      <div className="grid items-start gap-6 @2xl:grid-cols-2">
        <div className="grid min-w-0 gap-6">
          <Panel title="This Mac">
            <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
              <Laptop
                check={checks.laptop}
                disabled={disabled}
                onInstalled={reloadLaptop}
              />
            </Suspense>
          </Panel>
        </div>
        <div className="grid min-w-0 gap-6">
          <ReportPanel title="iPad" check={checks.ipad} explains>
            {(development) => <IpadTools development={development} />}
          </ReportPanel>
          <Panel title="USB tunnel">
            <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
              <Tunnel
                check={checks.tunnel}
                disabled={disabled}
                onChanged={reloadTunnel}
              />
            </Suspense>
          </Panel>
          <BuildAndShip disabled={disabled} />
        </div>
      </div>
    </Page>
  );
}
