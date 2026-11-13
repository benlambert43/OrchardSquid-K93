import type { DevelopmentProgress } from "@/bridge.ts";
import type { DevelopmentStep, DevelopmentTask } from "@/developmentSetup.ts";

const heartbeatMs = 1000;

export type ReportProgress = (progress: DevelopmentProgress) => void;

export type Announce = (
  step: DevelopmentStep,
  item?: string | null,
  fraction?: number | null,
) => void;

function percent(fraction: number | null): number | null {
  return fraction === null ? null : Math.round(fraction * 100);
}

export async function withProgress<Result>(
  task: DevelopmentTask,
  first: DevelopmentStep,
  report: ReportProgress,
  run: (announce: Announce) => Promise<Result>,
): Promise<Result> {
  const started = Date.now();
  let latest: Omit<DevelopmentProgress, "seconds"> = {
    task,
    step: first,
    item: null,
    fraction: null,
  };
  const send = () => {
    report({
      ...latest,
      seconds: Math.round((Date.now() - started) / 1000),
    });
  };
  const heartbeat = setInterval(send, heartbeatMs);
  try {
    send();
    return await run((step, item = null, fraction = null) => {
      const changed =
        step !== latest.step ||
        item !== latest.item ||
        percent(fraction) !== percent(latest.fraction);
      latest = { task, step, item, fraction };
      if (changed) {
        send();
      }
    });
  } finally {
    clearInterval(heartbeat);
  }
}
