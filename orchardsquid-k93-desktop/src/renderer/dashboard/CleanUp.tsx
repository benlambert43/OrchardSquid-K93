import { DetailNote } from "@orchardsquid-k93/ui";
import { useActionState, useId } from "react";

import type { IpadCleanUpReport } from "@/bridge.ts";
import {
  type CleanUpOption,
  type CleanUpStep,
  cleanUpOptions,
} from "@/cleanUpSteps.ts";
import { ConfirmButton } from "@/renderer/ConfirmButton.tsx";
import {
  followCleanUp,
  useCleanUpProgress,
} from "@/renderer/dashboard/cleanUpProgress.ts";
import { signedOutExplanation } from "@/renderer/ReportPanel.tsx";
import { formatBytes } from "@/renderer/format.ts";
import { TaskProgress } from "@/renderer/TaskProgress.tsx";
import { UnreachableNote } from "@/renderer/UnreachableNote.tsx";

type Outcome = IpadCleanUpReport | { state: "failed" } | null;

const optionDetails: Record<
  CleanUpOption,
  { label: string; size: string; detail: string }
> = {
  fonts: {
    label: "Chinese and Thai fonts",
    size: "56 MB",
    detail:
      "Text in those languages then shows in a fallback font or as empty boxes. Fonts for a language the iPad is set to use are kept.",
  },
  translations: {
    label: "Interface translations",
    size: "48 MB",
    detail:
      "The system's wording in every language the iPad is not set to use. About 40,000 small files, so this takes several minutes.",
  },
  systemData: {
    label: "Other system data",
    size: "107 MB",
    detail:
      "Map icons and road shields, Chinese handwriting recognition, voice-trigger data, and the dictionaries that find word boundaries in Chinese, Japanese and Korean. Maps inside apps and selecting words in those languages may stop working.",
  },
};

const stepLabels: Record<CleanUpStep, string> = {
  survey: "Checking what can be moved",
  search: "Finding the files of the optional steps",
  folders: "Linking folders",
  languages: "Moving language data",
  update: "Moving the update ramdisk",
  fonts: "Moving fonts",
  translations: "Moving interface translations",
  systemData: "Moving other system data",
};

function describeFree(before: number | null, after: number | null): string {
  if (after === null) {
    return "";
  }
  const freed =
    before !== null && after > before
      ? ` Freed ${formatBytes(after - before)}.`
      : "";
  return `${freed} The system volume has ${formatBytes(after)} free.`;
}

function Result({ outcome }: { outcome: Outcome }) {
  if (outcome === null) {
    return null;
  }
  if (outcome.state === "unreachable") {
    return <UnreachableNote connection={outcome.connection} />;
  }
  if (outcome.state !== "ok") {
    return (
      <p role="status" className="text-red-600 dark:text-red-400">
        {outcome.state === "signed-out"
          ? signedOutExplanation
          : "The clean-up could not run."}
      </p>
    );
  }
  const { moved, failed, freeBeforeBytes, freeAfterBytes } = outcome.cleanUp;
  const summary =
    moved.length > 0
      ? `Moved ${String(moved.length)} item${moved.length === 1 ? "" : "s"} to the data volume.`
      : "Nothing left to move.";
  return (
    <p role="status" className="text-zinc-600 dark:text-zinc-400">
      {summary}
      {describeFree(freeBeforeBytes, freeAfterBytes)}
      {failed.length > 0 && (
        <span className="block text-red-600 dark:text-red-400">
          Could not move: {failed.join(", ")}. Run it again to retry.
        </span>
      )}
    </p>
  );
}

function Options() {
  const id = useId();
  return (
    <fieldset className="grid gap-3">
      <legend className="pb-2 font-medium">Optional steps</legend>
      {cleanUpOptions.map((option) => {
        const { label, size, detail } = optionDetails[option];
        return (
          <div key={option} className="flex items-start gap-2.5">
            <input
              id={`${id}-${option}`}
              type="checkbox"
              name="option"
              value={option}
              className="mt-0.5 size-4 shrink-0 accent-emerald-600"
            />
            <label htmlFor={`${id}-${option}`}>
              <span className="font-medium">{label}</span>
              <span className="text-zinc-600 dark:text-zinc-400">
                {" "}
                · {size}
              </span>
              <DetailNote>{detail}</DetailNote>
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}

export function CleanUp({ onCleanedUp }: { onCleanedUp: () => void }) {
  const [outcome, action, isBusy] = useActionState(
    async (_previous: Outcome, formData: FormData): Promise<Outcome> => {
      const chosen = formData.getAll("option");
      const options = cleanUpOptions.filter((option) =>
        chosen.includes(option),
      );
      try {
        const report = await followCleanUp(() =>
          window.bridge.cleanUpIpad(options),
        );
        if (report.state === "ok") {
          onCleanedUp();
        }
        return report;
      } catch (error) {
        console.error("The iPad clean-up failed", error);
        return { state: "failed" };
      }
    },
    null,
  );
  const progress = useCleanUpProgress();
  const running = isBusy || progress !== null;

  return (
    <div className="pb-2.5">
      <dt className="sr-only">System volume clean-up</dt>
      <dd className="flex flex-col items-start gap-2">
        <ConfirmButton
          label={running ? "Cleaning up…" : "Clean Up"}
          title="Clean Up"
          disabled={running}
          action={action}
          fields={<Options />}
        >
          Moves these to the data volume, where they are kept in
          /private/var/stash/OrchardSquid: folders only command-line tools and
          SpringBoard read, which are replaced with links; keyboard, dictionary
          and speech data for languages the iPad is not set to use; and the
          ramdisk that installs iOS updates. Anything already moved is skipped.
        </ConfirmButton>
        {progress ? (
          <TaskProgress
            label="Clean-up progress"
            step={stepLabels[progress.step]}
            item={progress.item}
            fraction={progress.fraction}
            seconds={progress.seconds}
          />
        ) : (
          <Result outcome={outcome} />
        )}
      </dd>
    </div>
  );
}
