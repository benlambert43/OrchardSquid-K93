import { type ReactNode, useActionState } from "react";

import type { LaptopInstall } from "@/bridge.ts";
import {
  type DevelopmentStep,
  firstInstallSteps,
  type LaptopToolName,
} from "@/developmentSetup.ts";
import { ConfirmButton } from "@/renderer/ConfirmButton.tsx";
import {
  followDevelopment,
  stepLabels,
  useDevelopmentProgress,
} from "@/renderer/development/progress.ts";
import { Tool, ToolOutput } from "@/renderer/development/ToolList.tsx";
import { TaskProgress } from "@/renderer/TaskProgress.tsx";

type Outcome = LaptopInstall | { state: "error" } | null;

type Problem = Exclude<NonNullable<Outcome>["state"], "installed">;

function describe(name: string, problem: Problem): string {
  switch (problem) {
    case "busy":
      return "Another task is still running. Try again when it has finished.";
    case "occupied":
      return `${name}'s folder already holds something else. Move it away, then try again.`;
    case "unavailable":
      return `${name} could not be downloaded from GitHub. Check this computer's internet connection, then try again.`;
    case "mismatch":
      return `The download did not match what GitHub lists for ${name}, so nothing was unpacked.`;
    case "failed":
      return `${name} could not be set up. The last lines it printed:`;
    case "error":
      return `${name} could not be set up.`;
  }
}

function Result({ name, outcome }: { name: string; outcome: Outcome }) {
  if (outcome === null || outcome.state === "installed") {
    return null;
  }
  return (
    <div role="status" className="mt-2 text-red-600 dark:text-red-400">
      {describe(name, outcome.state)}
      {outcome.state === "failed" && <ToolOutput>{outcome.output}</ToolOutput>}
    </div>
  );
}

export function InstallTool({
  tool,
  name,
  label,
  busyLabel = "Installing…",
  firstStep = firstInstallSteps[tool],
  disabled,
  onInstalled,
  children,
}: {
  tool: LaptopToolName;
  name: string;
  label: string;
  busyLabel?: string;
  firstStep?: DevelopmentStep;
  disabled: boolean;
  onInstalled: () => Promise<unknown>;
  children: ReactNode;
}) {
  const [outcome, action, isBusy] = useActionState(
    async (): Promise<Outcome> => {
      try {
        const report = await followDevelopment(
          () => window.bridge.installLaptopTool(tool),
          { task: tool, step: firstStep },
        );
        if (report.state === "installed") {
          await onInstalled();
        }
        return report;
      } catch (error) {
        console.error(`${name} could not be set up`, error);
        return { state: "error" };
      }
    },
    null,
  );
  const progress = useDevelopmentProgress();

  return (
    <Tool
      name={name}
      ready={false}
      action={
        <ConfirmButton
          label={isBusy ? busyLabel : label}
          title={label}
          disabled={disabled || isBusy}
          action={action}
        >
          {children}
        </ConfirmButton>
      }
      status={
        progress?.task === tool ? (
          <div className="mt-2">
            <TaskProgress
              label={`${name} setup progress`}
              step={stepLabels[progress.step]}
              item={progress.item}
              fraction={progress.fraction}
              seconds={progress.seconds}
            />
          </div>
        ) : (
          <Result name={name} outcome={isBusy ? null : outcome} />
        )
      }
    />
  );
}
