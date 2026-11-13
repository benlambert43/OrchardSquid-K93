import { DetailNote, PanelNote } from "@orchardsquid-k93/ui";

import type { IpadDeveloperSetup, IpadSoftware } from "@/bridge.ts";
import { developerPackages, developerSources } from "@/developerSetup.ts";
import { formatNumber } from "@/renderer/format.ts";
import { Command } from "@/renderer/software/Command.tsx";

type StepState = "done" | "todo";

interface Step {
  label: string;
  state: StepState;
  detail: string;
  command?: string | undefined;
}

interface StepGroup {
  title: string;
  steps: Step[];
}

const stateLabels: Record<StepState, string> = {
  done: "Done",
  todo: "To do",
};

const indicatorClassNames: Record<StepState, string> = {
  done: "bg-emerald-500",
  todo: "bg-amber-500",
};

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
  ];
}

export function DeveloperDependencies({
  software,
}: {
  software: IpadSoftware;
}) {
  const groups = buildGroups(software);
  const steps = groups.flatMap((group) => group.steps);
  const done = steps.filter(({ state }) => state === "done").length;

  return (
    <>
      <PanelNote>
        {formatNumber(done)} of {formatNumber(steps.length)} steps done.
      </PanelNote>
      {groups.map(({ title, steps: groupSteps }) => (
        <section key={title}>
          <h3
            className="pt-4 pb-1.5 text-xs font-semibold tracking-wide
              text-zinc-500 uppercase"
          >
            {title}
          </h3>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {groupSteps.map(({ label, state, detail, command }) => (
              <li key={label} className="flex items-start gap-3 py-2.5">
                <span
                  aria-hidden
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full
                  ${indicatorClassNames[state]}`}
                />
                <span className="min-w-0 font-medium wrap-anywhere">
                  {label}
                  {command && <Command>{command}</Command>}
                  <DetailNote>{detail}</DetailNote>
                </span>
                <span
                  className="ml-auto shrink-0 text-zinc-600 dark:text-zinc-400"
                >
                  {stateLabels[state]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <PanelNote>
        Run the commands in the Shell tab. Offered versions come from
        Cydia&apos;s catalogue, which is only as fresh as the last refresh in
        Cydia.
      </PanelNote>
    </>
  );
}
