import type { CleanUpProgress } from "@/bridge.ts";
import { createProgressStore } from "@/renderer/progressStore.ts";

const store = createProgressStore<CleanUpProgress>((show) =>
  window.bridge.onCleanUpProgress(show),
);

export const useCleanUpProgress = store.useProgress;

export function followCleanUp<Result>(
  run: () => Promise<Result>,
): Promise<Result> {
  return store.follow(
    { step: "survey", item: null, fraction: 0, seconds: 0 },
    run,
  );
}
