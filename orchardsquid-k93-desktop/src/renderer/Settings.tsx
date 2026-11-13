import { Page, Panel, PanelNote } from "@orchardsquid-k93/ui";

import { pageLinks } from "@/renderer/navigation.ts";
import { SshBackup } from "@/renderer/SshBackup.tsx";
import { WifiAddress } from "@/renderer/WifiAddress.tsx";

function OnboardingLink() {
  return (
    <Panel title="Onboarding">
      <PanelNote>
        The{" "}
        <a href={pageLinks.onboarding} className="underline underline-offset-2">
          Onboarding page
        </a>{" "}
        walks through giving this computer SSH access to the iPad. It leaves the
        sidebar once every step is done, and returns there when a later check
        finds a step undone.
      </PanelNote>
    </Panel>
  );
}

export function Settings() {
  return (
    <Page title="Settings">
      <div className="grid max-w-xl gap-6">
        <WifiAddress />
        <SshBackup />
        <OnboardingLink />
      </div>
    </Page>
  );
}
