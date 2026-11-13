import { Page } from "@orchardsquid-k93/ui";

import { SshBackup } from "@/renderer/SshBackup.tsx";

export function Settings() {
  return (
    <Page title="Settings">
      <div className="max-w-xl">
        <SshBackup />
      </div>
    </Page>
  );
}
