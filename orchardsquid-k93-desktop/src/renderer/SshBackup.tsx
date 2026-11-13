import { Panel } from "@orchardsquid-k93/ui";
import { useActionState } from "react";

import type { SshBackupResult, SshRestoreResult } from "@/bridge.ts";
import { ConfirmButton } from "@/renderer/ConfirmButton.tsx";

type Intent = "export" | "restore";

type Outcome =
  | SshBackupResult
  | SshRestoreResult
  | { state: "failed"; intent: Intent }
  | null;

async function run(_previous: Outcome, intent: Intent): Promise<Outcome> {
  try {
    return intent === "restore"
      ? await window.bridge.restoreSshBackup()
      : await window.bridge.exportSshBackup();
  } catch (error) {
    console.error("The SSH backup request failed", error);
    return { state: "failed", intent };
  }
}

function describe(outcome: Outcome): string | null {
  switch (outcome?.state) {
    case "saved":
      return outcome.ipadIncluded
        ? `Saved to ${outcome.path}`
        : `Saved to ${outcome.path}, without the iPad's host key and SSH settings, because the iPad did not answer.`;
    case "restored":
      return [
        "Restored. This computer's key for the iPad is in place.",
        outcome.previousKey &&
          `The key that was here before is kept as ${outcome.previousKey}.`,
        outcome.skippedConfigHosts.length > 0 &&
          `Left out of ~/.ssh/config, for using options that are not restored: ${outcome.skippedConfigHosts.join(", ")}.`,
      ]
        .filter(Boolean)
        .join(" ");
    case "no-key":
      return "There is no key at ~/.ssh/orchardsquid-k93 to back up. The Onboarding page shows how to create one.";
    case "invalid":
      return "That file is not an SSH backup this app can read. Nothing was changed.";
    case "failed":
      return outcome.intent === "restore"
        ? "The backup could not be restored."
        : "The backup could not be saved.";
    default:
      return null;
  }
}

export function SshBackup() {
  const [outcome, action, isBusy] = useActionState(run, null);
  const message = describe(outcome);
  const succeeded = outcome?.state === "saved" || outcome?.state === "restored";

  return (
    <Panel title="SSH backup">
      <div className="flex flex-wrap gap-3 py-2.5">
        <ConfirmButton
          label="Export backup…"
          title="Export backup"
          disabled={isBusy}
          action={() => {
            action("export");
          }}
        >
          Saves this computer&apos;s key for the iPad, and the SSH settings that
          go with it, as a zip file. Whoever has the file can sign in to the
          iPad as root, so keep it somewhere safe.
        </ConfirmButton>
        <ConfirmButton
          label="Restore backup…"
          title="Restore backup"
          disabled={isBusy}
          action={() => {
            action("restore");
          }}
        >
          Reads an exported backup file back in, which is how another computer
          gets to sign in to the iPad.
        </ConfirmButton>
      </div>
      {message && (
        <p
          role="status"
          className={`py-2.5 wrap-anywhere ${
            succeeded
              ? "text-zinc-600 dark:text-zinc-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {message}
        </p>
      )}
    </Panel>
  );
}
