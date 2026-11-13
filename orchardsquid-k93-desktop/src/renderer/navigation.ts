import { useSyncExternalStore } from "react";

export type PageName =
  | "dashboard"
  | "onboarding"
  | "dependencies"
  | "apps"
  | "development"
  | "shell"
  | "settings";

export const pageLinks: Record<PageName, string> = {
  dashboard: "#/",
  onboarding: "#/onboarding",
  dependencies: "#/dependencies",
  apps: "#/apps",
  development: "#/development",
  shell: "#/shell",
  settings: "#/settings",
};

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
  };
}

function currentPage(): PageName {
  switch (window.location.hash) {
    case pageLinks.onboarding:
      return "onboarding";
    case pageLinks.dependencies:
      return "dependencies";
    case pageLinks.apps:
      return "apps";
    case pageLinks.development:
      return "development";
    case pageLinks.shell:
      return "shell";
    case pageLinks.settings:
      return "settings";
    default:
      return "dashboard";
  }
}

export function usePage(): PageName {
  return useSyncExternalStore(subscribe, currentPage);
}
