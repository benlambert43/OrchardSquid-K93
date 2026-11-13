import type { ReactNode } from "react";

import { SectionHeading } from "./AppShell.tsx";

export function StatusSection({ children }: { children: ReactNode }) {
  return (
    <section className="w-full max-w-sm text-left">
      <SectionHeading>System status</SectionHeading>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {children}
      </ul>
    </section>
  );
}
