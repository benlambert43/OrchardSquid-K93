import { useSyncExternalStore } from "react";

import type { CleanUpProgress } from "@/bridge.ts";

const listeners = new Set<() => void>();
let progress: CleanUpProgress | null = null;

function show(next: CleanUpProgress | null): void {
  progress = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useCleanUpProgress(): CleanUpProgress | null {
  return useSyncExternalStore(subscribe, () => progress);
}

export async function followCleanUp<Result>(
  run: () => Promise<Result>,
): Promise<Result> {
  const stop = window.bridge.onCleanUpProgress(show);
  show({ step: "survey", item: null, fraction: 0, seconds: 0 });
  try {
    return await run();
  } finally {
    stop();
    show(null);
  }
}
