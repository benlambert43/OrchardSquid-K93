import "server-only";

import type { Metadata } from "next";

export const site = {
  name: "OrchardSquid-K93",
  description: "All-in-one admin tool for K93 devices",
};

export const siteOpenGraph = {
  type: "website",
  siteName: site.name,
} satisfies Metadata["openGraph"];

export function siteUrl(): URL {
  const url = process.env.SITE_URL;
  if (!url) {
    throw new Error("SITE_URL is not set");
  }
  return new URL(url);
}
