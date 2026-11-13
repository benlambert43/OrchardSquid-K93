import { useSyncExternalStore } from "react";

export type PageName = "dashboard" | "dependencies" | "shell" | "settings";

export const pageLinks: Record<PageName, string> = {
  dashboard: "#/",
  dependencies: "#/dependencies",
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
    case pageLinks.dependencies:
      return "dependencies";
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
