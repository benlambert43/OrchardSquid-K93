import { Panel, PanelNote } from "@orchardsquid-k93/ui";
import { type ReactNode, Suspense, use } from "react";

export type Unreached =
  { state: "unplugged" } | { state: "signed-out" } | { state: "failed" };

export type Check<Reading> = { state: "ok"; reading: Reading } | Unreached;

const explanations: Record<Unreached["state"], string> = {
  unplugged: "Connect the iPad 2 with its USB cable.",
  "signed-out":
    "The iPad does not accept this computer's SSH key yet. The README explains how to add it.",
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
  return explains ? (
    <PanelNote>{explanations[loaded.state]}</PanelNote>
  ) : (
    <Unavailable />
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
