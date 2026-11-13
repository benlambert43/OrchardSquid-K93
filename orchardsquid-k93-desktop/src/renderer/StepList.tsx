import { DetailNote, PanelNote } from "@orchardsquid-k93/ui";

import { formatNumber } from "@/renderer/format.ts";
import { Command } from "@/renderer/Command.tsx";

export type StepState = "done" | "todo";

export interface Step {
  label: string;
  state: StepState;
  detail: string;
  command?: string | undefined;
}

export interface StepGroup {
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

export function StepList({ groups }: { groups: StepGroup[] }) {
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
    </>
  );
}
