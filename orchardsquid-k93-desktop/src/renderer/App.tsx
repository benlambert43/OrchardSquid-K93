import { AppShell } from "@orchardsquid-k93/ui";

import { StatusChecks } from "@/renderer/StatusChecks.tsx";

export function App() {
  return (
    <AppShell
      title="OrchardSquid-K93"
      description="All-in-one admin tool for an iPad 2"
    >
      <StatusChecks />
    </AppShell>
  );
}
