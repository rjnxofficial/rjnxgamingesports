import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/** Allows indexing of public pages; keeps the private control surfaces out. */
export default function robots(): MetadataRoute.Robots {
  const base = env.siteUrl.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/api/", "/auth/", "/reset-password", "/suspended"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
