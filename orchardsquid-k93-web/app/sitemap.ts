import type { MetadataRoute } from "next";

import { siteUrl } from "@/app/_lib/site.ts";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL("/", siteUrl()).href }];
}
