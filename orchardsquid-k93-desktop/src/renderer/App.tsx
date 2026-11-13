import { CommandLineIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { AppFrame } from "@orchardsquid-k93/ui";

import { Dashboard } from "@/renderer/Dashboard.tsx";
import { pageLinks, usePage } from "@/renderer/navigation.ts";
import { Shell } from "@/renderer/Shell.tsx";

export function App() {
  const page = usePage();
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
          href: pageLinks.shell,
          label: "Shell",
          icon: <CommandLineIcon aria-hidden className="size-5" />,
          current: page === "shell",
        },
      ]}
    >
      {page === "shell" ? <Shell /> : <Dashboard />}
    </AppFrame>
  );
}
