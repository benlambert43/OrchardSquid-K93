import type { MetadataRoute } from "next";

import { siteUrl } from "@/app/_lib/site.ts";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", siteUrl()).href,
  };
}
