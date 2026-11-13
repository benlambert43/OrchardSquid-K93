import { PanelNote } from "@orchardsquid-k93/ui";

import type { IpadDeveloperSetup, IpadSoftware } from "@/bridge.ts";
import {
  compilerFolder,
  developerPackages,
  developerSources,
} from "@/developerSetup.ts";
import { formatBytes } from "@/renderer/format.ts";
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

function afterAptGet(setup: IpadDeveloperSetup): string {
  return setup.aptGet ? "" : " Run this once apt-get is installed.";
}

function packageStep(software: IpadSoftware, label: string, id: string): Step {
  const setup = software.developerSetup;
  const installed = software.packages.find((listing) => listing.id === id);
  if (installed) {
    return { label, state: "done", detail: `Version ${installed.version}.` };
  }
  const offered = (setup.offers[id] ?? []).length > 0;
  return {
    label,
    state: "todo",
    detail: `Not installed. ${describeOffers(setup, id)}${offered ? afterAptGet(setup) : ""}`,
    ...(offered && { command: `apt-get install ${id}` }),
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

function isInstalled(software: IpadSoftware, id: string): boolean {
  return software.packages.some((listing) => listing.id === id);
}

function compilerMoved(setup: IpadDeveloperSetup): boolean {
  return setup.compilerFolderLink?.startsWith("/private/var/") ?? false;
}

function compilerFolderStep(software: IpadSoftware): Step {
  const label = "Clang's folder on the data volume";
  const setup = software.developerSetup;
  if (compilerMoved(setup)) {
    return {
      label,
      state: "done",
      detail: `${compilerFolder.path} links to ${setup.compilerFolderLink ?? ""}.`,
    };
  }
  if (isInstalled(software, developerPackages.compiler)) {
    return {
      label,
      state: "done",
      detail: `Clang is already installed in ${compilerFolder.path}.`,
    };
  }
  return {
    label,
    state: "todo",
    detail: `Clang puts all its files in ${compilerFolder.path}, about 270 MB, which does not fit on the system volume. This links that folder to the data volume first, and dpkg then installs through the link.`,
    command: `mkdir -p ${compilerFolder.dataPath} && ln -s ${compilerFolder.dataPath} ${compilerFolder.path}`,
  };
}

function compilerSpaceNeeded(software: IpadSoftware): number {
  const moved = compilerMoved(software.developerSetup);
  const sizes = developerPackages.compilerParts
    .filter((id) => !isInstalled(software, id))
    .filter((id) => !(moved && id === developerPackages.compiler))
    .map((id) =>
      Math.max(
        0,
        ...(software.developerSetup.offers[id] ?? []).map(
          ({ installedBytes }) => installedBytes ?? 0,
        ),
      ),
    );
  return sizes.reduce((total, size) => total + size, 0);
}

function compilerSpaceStep(software: IpadSoftware): Step {
  const label = "Room for the compiler";
  const needed = compilerSpaceNeeded(software);
  const free = software.developerSetup.systemFreeBytes;
  if (needed === 0) {
    return { label, state: "done", detail: "Nothing left to install." };
  }
  if (free === null) {
    return {
      label,
      state: "todo",
      detail: "The free space on the system volume could not be read.",
    };
  }
  const sizes = `What is left to install needs about ${formatBytes(needed)} on the system volume, which has ${formatBytes(free)} free.`;
  return free >= needed
    ? {
        label,
        state: "done",
        detail: `${sizes} That leaves about ${formatBytes(free - needed)}.`,
      }
    : {
        label,
        state: "todo",
        detail: `${sizes} Installing it now would fail part way.`,
      };
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
        setup.aptGet
          ? { label: "apt-get", state: "done", detail: "Ready to use." }
          : {
              label: "apt-get",
              state: "todo",
              detail: `Not installed. It comes with the ${developerPackages.aptGet} package. The apt-get section above walks through installing it.`,
            },
        ...developerPackages.tools.map((id) => packageStep(software, id, id)),
      ],
    },
    {
      title: "Certificates and repositories",
      steps: [
        setup.rootCertificates
          ? {
              label: "Updated root certificates",
              state: "done",
              detail:
                "The profile from tlsroot.litten.ca is installed. It updates iOS's own trust store.",
            }
          : {
              label: "Updated root certificates",
              state: "todo",
              detail:
                "Open tlsroot.litten.ca in Safari and install its signed bundle. It is a configuration profile, not a repository.",
            },
        sourceStep(setup, "LukeZGD's repository", developerSources.lukeZgd),
      ],
    },
    {
      title: "Compiler",
      steps: [
        compilerFolderStep(software),
        compilerSpaceStep(software),
        packageStep(software, "Clang (32-bit)", developerPackages.compiler),
        packageStep(software, "ld64 and cctools", developerPackages.linker),
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
