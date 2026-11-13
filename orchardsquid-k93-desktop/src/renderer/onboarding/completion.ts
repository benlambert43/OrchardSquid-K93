import { useSyncExternalStore } from "react";

import type { IpadOnboarding } from "@/bridge.ts";

const listeners = new Set<() => void>();
let complete = true;
let started = false;

function conclude(value: boolean): void {
  if (value !== complete) {
    complete = value;
    for (const listener of listeners) {
      listener();
    }
  }
}

export async function loadOnboarding(): Promise<IpadOnboarding | null> {
  try {
    const onboarding = await window.bridge.readIpadOnboarding();
    conclude(onboarding.complete);
    return onboarding;
  } catch (error) {
    console.error("Onboarding check failed", error);
    return null;
  }
}

async function start(): Promise<void> {
  try {
    conclude(await window.bridge.readOnboardingComplete());
  } catch (error) {
    console.error("The onboarding setting could not be read", error);
  }
  await loadOnboarding();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!started) {
    started = true;
    void start();
  }
  return () => {
    listeners.delete(onChange);
  };
}

export function useOnboardingComplete(): boolean {
  return useSyncExternalStore(subscribe, () => complete);
}
