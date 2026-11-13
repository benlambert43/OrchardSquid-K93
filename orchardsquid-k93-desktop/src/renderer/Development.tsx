import { Button, Page, Panel, PanelNote } from "@orchardsquid-k93/ui";
import { Suspense, use, useState, useTransition } from "react";

import type { IpadSoftware, LaptopToolchain } from "@/bridge.ts";
import { loadSoftware } from "@/renderer/Dependencies.tsx";
import { BuildAndShip } from "@/renderer/development/BuildAndShip.tsx";
import { LaptopSetup } from "@/renderer/development/LaptopSetup.tsx";
import { OtherToolchains } from "@/renderer/development/OtherToolchains.tsx";
import { type Check, ReportPanel } from "@/renderer/ReportPanel.tsx";
import { pageLinks } from "@/renderer/navigation.ts";
import { type StepGroup, StepList } from "@/renderer/StepList.tsx";

type LaptopCheck = LaptopToolchain | null;

async function loadToolchain(): Promise<LaptopCheck> {
  try {
    return await window.bridge.readLaptopToolchain();
  } catch (error) {
    console.error("Laptop toolchain check failed", error);
    return null;
  }
}

interface Checks {
  laptop: Promise<LaptopCheck>;
  software: Promise<Check<IpadSoftware>>;
}

function loadChecks(): Checks {
  return { laptop: loadToolchain(), software: loadSoftware() };
}

function Laptop({ check }: { check: Promise<LaptopCheck> }) {
  const toolchain = use(check);
  return toolchain ? (
    <LaptopSetup toolchain={toolchain} />
  ) : (
    <PanelNote>This Mac&apos;s tools could not be checked.</PanelNote>
  );
}

function ipadGroups(software: IpadSoftware): StepGroup[] {
  return [
    {
      title: "Receiving builds",
      steps: [
        software.openssh
          ? {
              label: "OpenSSH",
              state: "done",
              detail: `Version ${software.openssh}.`,
            }
          : {
              label: "OpenSSH",
              state: "todo",
              detail: "Not installed. Install it from Cydia.",
            },
        {
          label: "SSH sign-in as root",
          state: "done",
          detail:
            "This page was read over SSH with this app's key, which is the key the Build and ship steps use.",
        },
      ],
    },
  ];
}

export function Development() {
  const [checks, setChecks] = useState(loadChecks);
  const [isRefreshing, startRefresh] = useTransition();

  return (
    <Page
      title="Development"
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
      <div className="grid max-w-3xl gap-6">
        <Panel title="This Mac">
          <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
            <Laptop check={checks.laptop} />
          </Suspense>
        </Panel>
        <ReportPanel title="iPad" check={checks.software} explains>
          {(software) => (
            <>
              <StepList groups={ipadGroups(software)} />
              <PanelNote>
                Tools that run on the iPad itself are on the{" "}
                <a className="underline" href={pageLinks.dependencies}>
                  Dependencies
                </a>{" "}
                page.
              </PanelNote>
            </>
          )}
        </ReportPanel>
        <BuildAndShip />
        <OtherToolchains />
      </div>
    </Page>
  );
}
