import { Panel, PanelNote } from "@orchardsquid-k93/ui";
import { type ReactNode, Suspense, use } from "react";

import type { Unreachable } from "@/bridge.ts";
import { UnreachableNote } from "@/renderer/UnreachableNote.tsx";

export type Unreached =
  Unreachable | { state: "signed-out" } | { state: "failed" };

export type Check<Reading> = { state: "ok"; reading: Reading } | Unreached;

export const signedOutExplanation =
  "The iPad does not accept this computer's SSH key yet. The README explains how to add it.";

const explanations: Record<
  Exclude<Unreached["state"], "unreachable">,
  string
> = {
  "signed-out": signedOutExplanation,
  failed: "The iPad did not answer over SSH.",
};

interface ReportPanelProps<Reading> {
  title: string;
  check: Promise<Check<Reading>>;
  explains?: boolean;
  children: (reading: Reading) => ReactNode;
}

export function Unavailable() {
  return <PanelNote>Not available.</PanelNote>;
}

function Report<Reading>({
  check,
  explains = false,
  children,
}: Omit<ReportPanelProps<Reading>, "title">) {
  const loaded = use(check);
  if (loaded.state === "ok") {
    return children(loaded.reading);
  }
  if (!explains) {
    return <Unavailable />;
  }
  return loaded.state === "unreachable" ? (
    <UnreachableNote connection={loaded.connection} />
  ) : (
    <PanelNote>{explanations[loaded.state]}</PanelNote>
  );
}

export function ReportPanel<Reading>({
  title,
  ...report
}: ReportPanelProps<Reading>) {
  return (
    <Panel title={title}>
      <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
        <Report {...report} />
      </Suspense>
    </Panel>
  );
}
