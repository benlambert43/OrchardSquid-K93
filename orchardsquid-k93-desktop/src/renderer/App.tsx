import { AppShell } from "@orchardsquid-k93/ui";

import { Notes } from "@/renderer/Notes.tsx";
import { StatusChecks } from "@/renderer/StatusChecks.tsx";

export function App() {
  return (
    <AppShell title="OrchardSquid-K93" description="OrchardSquid-K93 toolchain">
      <Notes />
      <StatusChecks />
    </AppShell>
  );
}
