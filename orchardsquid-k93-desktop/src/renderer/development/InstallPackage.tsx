import { useActionState } from "react";

import type { PackageInstallReport } from "@/bridge.ts";
import { ConfirmButton } from "@/renderer/ConfirmButton.tsx";
import {
  followDevelopment,
  stepLabels,
  useDevelopmentProgress,
} from "@/renderer/development/progress.ts";
import { ToolOutput } from "@/renderer/development/ToolList.tsx";
import { signedOutExplanation } from "@/renderer/ReportPanel.tsx";
import { TaskProgress } from "@/renderer/TaskProgress.tsx";
import { UnreachableNote } from "@/renderer/UnreachableNote.tsx";

type Outcome = PackageInstallReport | { state: "failed" } | null;

function Result({ outcome }: { outcome: Outcome }) {
  if (outcome === null || outcome.state === "cancelled") {
    return null;
  }
  if (outcome.state === "unreachable") {
    return <UnreachableNote connection={outcome.connection} />;
  }
  if (outcome.state === "installed") {
    const installed = [outcome.package ?? outcome.file, outcome.version]
      .filter(Boolean)
      .join(" ");
    return (
      <p role="status" className="text-zinc-600 dark:text-zinc-400">
        Installed {installed} on the iPad.
        {!outcome.homeScreenRefreshed &&
          " The Home screen was not refreshed, so an app's icon shows only after the iPad restarts."}
      </p>
    );
  }
  return (
    <div role="status" className="text-red-600 dark:text-red-400">
      {outcome.state === "signed-out" && signedOutExplanation}
      {outcome.state === "failed" && "The package could not be installed."}
      {outcome.state === "invalid" &&
        `${outcome.file} is not a .deb package this app can copy. Nothing was sent to the iPad.`}
      {outcome.state === "refused" && (
        <>
          The iPad did not install {outcome.file}. dpkg reported:
          <ToolOutput>{outcome.output}</ToolOutput>
        </>
      )}
    </div>
  );
}

export function InstallPackage({ disabled }: { disabled: boolean }) {
  const [outcome, action, isBusy] = useActionState(
    async (): Promise<Outcome> => {
      try {
        return await followDevelopment(() =>
          window.bridge.installIpadPackage(),
        );
      } catch (error) {
        console.error("The package could not be installed", error);
        return { state: "failed" };
      }
    },
    null,
  );
  const progress = useDevelopmentProgress();

  return (
    <div className="flex flex-col items-start gap-2 py-2.5">
      <ConfirmButton
        label="Install package…"
        title="Install package"
        disabled={disabled || isBusy}
        action={action}
      >
        Asks for a .deb file on this Mac, copies it to /private/var/tmp on the
        iPad, installs it there with dpkg as root, deletes the copy and
        refreshes the Home screen.
      </ConfirmButton>
      {progress?.task === "package" ? (
        <TaskProgress
          label="Package install progress"
          step={stepLabels[progress.step]}
          item={progress.item}
          fraction={progress.fraction}
          seconds={progress.seconds}
        />
      ) : (
        <Result outcome={isBusy ? null : outcome} />
      )}
    </div>
  );
}
