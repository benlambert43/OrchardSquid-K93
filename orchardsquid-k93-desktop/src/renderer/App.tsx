import {
  Cog6ToothIcon,
  CommandLineIcon,
  CubeIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { AppFrame } from "@orchardsquid-k93/ui";
import type { JSX } from "react";

import { Dashboard } from "@/renderer/Dashboard.tsx";
import { Dependencies } from "@/renderer/Dependencies.tsx";
import { type PageName, pageLinks, usePage } from "@/renderer/navigation.ts";
import { Settings } from "@/renderer/Settings.tsx";
import { Shell } from "@/renderer/Shell.tsx";

const pages: Record<PageName, () => JSX.Element> = {
  dashboard: Dashboard,
  dependencies: Dependencies,
  shell: Shell,
  settings: Settings,
};

export function App() {
  const page = usePage();
  const CurrentPage = pages[page];
  return (
    <AppFrame
      title="OrchardSquid-K93"
      description="All-in-one admin tool for K93 devices"
      navigation={[
        {
          href: pageLinks.dashboard,
          label: "Dashboard",
          icon: <Squares2X2Icon aria-hidden className="size-5" />,
          current: page === "dashboard",
        },
        {
          href: pageLinks.dependencies,
          label: "Dependencies",
          icon: <CubeIcon aria-hidden className="size-5" />,
          current: page === "dependencies",
        },
        {
          href: pageLinks.shell,
          label: "Shell",
          icon: <CommandLineIcon aria-hidden className="size-5" />,
          current: page === "shell",
        },
        {
          href: pageLinks.settings,
          label: "Settings",
          icon: <Cog6ToothIcon aria-hidden className="size-5" />,
          current: page === "settings",
        },
      ]}
    >
      <CurrentPage />
    </AppFrame>
  );
}
