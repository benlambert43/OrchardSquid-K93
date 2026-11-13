import { AppShell } from "@orchardsquid-k93/ui";
import type { Metadata } from "next";

import { Notes } from "@/app/_components/Notes.tsx";
import { StatusChecks } from "@/app/_components/StatusChecks.tsx";
import { site, siteOpenGraph } from "@/app/_lib/site.ts";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...siteOpenGraph, url: "/" },
};

export default function Home() {
  return (
    <AppShell title={site.name} description={site.description}>
      <Notes />
      <StatusChecks />
    </AppShell>
  );
}
