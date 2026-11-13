import type { DevelopmentProgress } from "@/bridge.ts";
import type { DevelopmentStep, DevelopmentTask } from "@/developmentSetup.ts";
import { createProgressStore } from "@/renderer/progressStore.ts";

const store = createProgressStore<DevelopmentProgress>((show) =>
  window.bridge.onDevelopmentProgress(show),
);

export const useDevelopmentProgress = store.useProgress;

export function followDevelopment<Result>(
  run: () => Promise<Result>,
  first?: { task: DevelopmentTask; step: DevelopmentStep },
): Promise<Result> {
  return store.follow(
    first ? { ...first, item: null, fraction: null, seconds: 0 } : null,
    run,
  );
}

export const stepLabels: Record<DevelopmentStep, string> = {
  clone: "Cloning Theos",
  submodules: "Cloning Theos's submodules",
  shellProfile: "Adding THEOS to the shell profile",
  release: "Looking up the newest SDK release",
  download: "Downloading the SDK",
  unpack: "Unpacking the SDK",
  homebrew: "Running Homebrew",
  copy: "Copying the package to the iPad",
  dpkg: "Installing with dpkg",
  homeScreen: "Refreshing the Home screen",
};
