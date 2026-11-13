import { useActionState } from "react";

import type { ZebraInstallReport } from "@/bridge.ts";
import { ConfirmButton } from "@/renderer/ConfirmButton.tsx";
import { signedOutExplanation } from "@/renderer/ReportPanel.tsx";
import { UnreachableNote } from "@/renderer/UnreachableNote.tsx";

type Outcome = ZebraInstallReport | { state: "failed" } | null;

type Problem = Exclude<
  NonNullable<Outcome>["state"],
  "installed" | "unreachable"
>;

const problems: Record<Problem, string> = {
  unavailable:
    "Zebra could not be downloaded from getzbra.com. Check this computer's internet connection, then try again.",
  mismatch:
    "The download did not match the checksum in Zebra's repository, so nothing was copied to the iPad.",
  refused: "The iPad did not install it. dpkg reported:",
  "signed-out": signedOutExplanation,
  failed: "Zebra could not be installed.",
};

function Result({ outcome }: { outcome: Outcome }) {
  if (outcome === null) {
    return null;
  }
  if (outcome.state === "unreachable") {
    return <UnreachableNote connection={outcome.connection} />;
  }
  if (outcome.state === "installed") {
    return (
      <p role="status" className="text-zinc-600 dark:text-zinc-400">
        {outcome.homeScreenRefreshed
          ? `Installed Zebra ${outcome.version}. Its icon is on the iPad's Home screen.`
          : `Installed Zebra ${outcome.version}, but the Home screen was not refreshed. Run su mobile -c uicache on the Shell page, or restart the iPad, to see its icon.`}
      </p>
    );
  }
  return (
    <div role="status" className="text-red-600 dark:text-red-400">
      {problems[outcome.state]}
      {outcome.state === "refused" && (
        <pre
          className="mt-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5 font-mono
            text-xs whitespace-pre-wrap dark:bg-zinc-900"
        >
          {outcome.output}
        </pre>
      )}
    </div>
  );
}

export function InstallZebra({
  installed,
  onInstalled,
}: {
  installed: boolean;
  onInstalled: () => Promise<unknown>;
}) {
  const [latest, action, isBusy] = useActionState(
    async (): Promise<Outcome> => {
      try {
        const report = await window.bridge.installZebraOnIpad();
        if (report.state === "installed") {
          await onInstalled();
        }
        return report;
      } catch (error) {
        console.error("Zebra could not be installed", error);
        return { state: "failed" };
      }
    },
    null,
  );
  const outcome =
    isBusy || (latest?.state === "installed" && !installed) ? null : latest;

  if (installed && outcome === null) {
    return null;
  }
  return (
    <div className="mt-2 flex flex-col items-start gap-2 font-normal">
      {!installed && (
        <ConfirmButton
          label={isBusy ? "Installing Zebra…" : "Install Zebra App"}
          title="Install Zebra App"
          disabled={isBusy}
          action={action}
        >
          Downloads the newest Zebra from getzbra.com to this computer, checks
          it against the repository&apos;s checksum, copies it to the iPad,
          installs it with dpkg and refreshes the Home screen.
        </ConfirmButton>
      )}
      <Result outcome={outcome} />
    </div>
  );
}
