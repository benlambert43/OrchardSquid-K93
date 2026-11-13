import { useActionState } from "react";

import type { IpadCleanUpReport } from "@/bridge.ts";
import { ConfirmButton } from "@/renderer/ConfirmButton.tsx";
import { signedOutExplanation } from "@/renderer/ReportPanel.tsx";
import { formatBytes } from "@/renderer/format.ts";
import { UnreachableNote } from "@/renderer/UnreachableNote.tsx";

type Outcome = IpadCleanUpReport | { state: "failed" } | null;

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

export function CleanUp({ onCleanedUp }: { onCleanedUp: () => void }) {
  const [outcome, action, isBusy] = useActionState(
    async (): Promise<Outcome> => {
      try {
        const report = await window.bridge.cleanUpIpad();
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

  return (
    <div className="pb-2.5">
      <dt className="sr-only">System volume clean-up</dt>
      <dd className="flex flex-col items-start gap-2">
        <ConfirmButton
          label={isBusy ? "Cleaning up…" : "Clean Up"}
          title="Clean Up"
          disabled={isBusy}
          action={action}
        >
          Moves the stock internet apps except Safari, and folders only
          command-line tools and SpringBoard read, to the data volume. Folders
          are replaced with links, and apps are kept in
          /private/var/stash/OrchardSquid. Anything already moved is skipped.
        </ConfirmButton>
        <Result outcome={outcome} />
      </dd>
    </div>
  );
}
