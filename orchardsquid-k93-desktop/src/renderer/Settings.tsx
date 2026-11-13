import { Page } from "@orchardsquid-k93/ui";

import { SshBackup } from "@/renderer/SshBackup.tsx";
import { WifiAddress } from "@/renderer/WifiAddress.tsx";

export function Settings() {
  return (
    <Page title="Settings">
      <div className="grid max-w-xl gap-6">
        <WifiAddress />
        <SshBackup />
      </div>
    </Page>
  );
}
