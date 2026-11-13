import { useSyncExternalStore } from "react";

export function createProgressStore<Progress>(
  listen: (show: (progress: Progress) => void) => () => void,
) {
  const listeners = new Set<() => void>();
  let progress: Progress | null = null;

  function show(next: Progress | null): void {
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

  function useProgress(): Progress | null {
    return useSyncExternalStore(subscribe, () => progress);
  }

  async function follow<Result>(
    first: Progress | null,
    run: () => Promise<Result>,
  ): Promise<Result> {
    const stop = listen(show);
    show(first);
    try {
      return await run();
    } finally {
      stop();
      show(null);
    }
  }

  return { useProgress, follow };
}
