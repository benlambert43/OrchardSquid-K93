import { DetailNote } from "@orchardsquid-k93/ui";

import { Command } from "@/renderer/Command.tsx";

export interface NumberedStep {
  title: string;
  command: string;
  explanation: string;
}

export function NumberedSteps({ steps }: { steps: NumberedStep[] }) {
  return (
    <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {steps.map(({ title, command, explanation }, index) => (
        <li key={title} className="flex items-start gap-3 py-2.5">
          <span
            aria-hidden
            className="w-5 shrink-0 text-right text-zinc-500 tabular-nums"
          >
            {index + 1}.
          </span>
          <span className="min-w-0 font-medium wrap-anywhere">
            {title}
            <Command>{command}</Command>
            <DetailNote>{explanation}</DetailNote>
          </span>
        </li>
      ))}
    </ol>
  );
}
