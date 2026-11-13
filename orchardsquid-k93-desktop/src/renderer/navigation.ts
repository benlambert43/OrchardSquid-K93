import { useSyncExternalStore } from "react";

export type PageName = "dashboard" | "software" | "shell" | "settings";

export const pageLinks: Record<PageName, string> = {
  dashboard: "#/",
  software: "#/software",
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
    case pageLinks.software:
      return "software";
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
