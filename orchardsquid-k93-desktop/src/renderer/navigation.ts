import { useSyncExternalStore } from "react";

export type PageName = "dashboard" | "shell";

export const pageLinks: Record<PageName, string> = {
  dashboard: "#/",
  shell: "#/shell",
};

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
  };
}

function currentPage(): PageName {
  return window.location.hash === pageLinks.shell ? "shell" : "dashboard";
}

export function usePage(): PageName {
  return useSyncExternalStore(subscribe, currentPage);
}
