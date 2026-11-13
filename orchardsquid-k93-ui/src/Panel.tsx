import type { ReactNode } from "react";

import { SectionHeading } from "./AppShell.tsx";

export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <SectionHeading>{title}</SectionHeading>
      <div className="mt-2 text-sm">{children}</div>
    </section>
  );
}

export function PanelNote({ children }: { children: ReactNode }) {
  return <p className="py-2.5 text-zinc-600 dark:text-zinc-400">{children}</p>;
}
