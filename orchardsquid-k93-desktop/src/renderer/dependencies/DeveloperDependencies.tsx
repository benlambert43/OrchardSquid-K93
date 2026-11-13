import { PanelNote } from "@orchardsquid-k93/ui";

import type { IpadDeveloperSetup, IpadSoftware } from "@/bridge.ts";
import { developerPackages, developerSources } from "@/developerSetup.ts";
import { type Step, type StepGroup, StepList } from "@/renderer/StepList.tsx";

const listFormat = new Intl.ListFormat(undefined, { type: "conjunction" });

function describeOffers(setup: IpadDeveloperSetup, id: string): string {
  const offers = setup.offers[id] ?? [];
  if (offers.length === 0) {
    return "No source on the iPad offers it.";
  }
  const sources = offers.map(({ source, version }) => `${source} (${version})`);
  return `Offered by ${listFormat.format(sources)}.`;
}

function hasSource(setup: IpadDeveloperSetup, prefix: string): boolean {
  return setup.sources.some((added) => added.startsWith(prefix));
}

function packageStep(software: IpadSoftware, label: string, id: string): Step {
  const installed = software.packages.find((listing) => listing.id === id);
  return installed
    ? { label, state: "done", detail: `Version ${installed.version}.` }
    : {
        label,
        state: "todo",
        detail: `Not installed. ${describeOffers(software.developerSetup, id)}`,
      };
}

function sourceStep(
  setup: IpadDeveloperSetup,
  label: string,
  source: { prefix: string; file: string; line: string },
): Step {
  return hasSource(setup, source.prefix)
    ? {
        label,
        state: "done",
        detail: `${source.prefix} is in the iPad's sources.`,
      }
    : {
        label,
        state: "todo",
        detail: `Add ${source.prefix} as a source.`,
        command: `echo '${source.line}' > /etc/apt/sources.list.d/${source.file}`,
      };
}

function passwordStep(setup: IpadDeveloperSetup, account: string): Step {
  const label = `Password for ${account}`;
  return setup.defaultPasswordAccounts.includes(account)
    ? {
        label,
        state: "todo",
        detail: "Still the factory default.",
        command: `passwd ${account}`,
      }
    : { label, state: "done", detail: "Changed from the factory default." };
}

function buildGroups(software: IpadSoftware): StepGroup[] {
  const setup = software.developerSetup;
  return [
    {
      title: "Package manager",
      steps: [
        sourceStep(setup, "Zebra repository", developerSources.zebra),
        packageStep(software, "Zebra", developerPackages.zebra),
        software.cydia
          ? {
              label: "Cydia kept",
              state: "done",
              detail: `Version ${software.cydia} is still installed.`,
            }
          : {
              label: "Cydia kept",
              state: "todo",
              detail: "Cydia is missing, and the jailbreak depends on it.",
            },
      ],
    },
    {
      title: "Command line over SSH",
      steps: [
        packageStep(software, "OpenSSH", "openssh"),
        {
          label: "SSH sign-in",
          state: "done",
          detail: "This page was read over SSH as root.",
        },
        passwordStep(setup, "root"),
        passwordStep(setup, "mobile"),
      ],
    },
  ];
}

export function DeveloperDependencies({
  software,
}: {
  software: IpadSoftware;
}) {
  return (
    <>
      <StepList groups={buildGroups(software)} />
      <PanelNote>
        Run the commands in the Shell tab. Offered versions come from
        Cydia&apos;s catalogue, which is only as fresh as the last refresh in
        Cydia.
      </PanelNote>
    </>
  );
}
