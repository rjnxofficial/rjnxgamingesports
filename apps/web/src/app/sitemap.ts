import type { MetadataRoute } from "next";
import { dataClient } from "@/lib/supabase/safe";
import { env } from "@/lib/env";

export const revalidate = 3600;

const STATIC_PATHS = [
  "",
  "/tournaments",
  "/results",
  "/leaderboard",
  "/teams",
  "/players",
  "/news",
  "/about",
  "/contact",
  "/faq",
  "/support",
  "/terms",
  "/privacy",
  "/login",
  "/register",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl.replace(/\/$/, "");
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    const supabase = await dataClient();
    const [{ data: tournaments }, { data: articles }] = await Promise.all([
      supabase.from("tournaments").select("slug, updated_at").neq("status", "draft").limit(500),
      supabase.from("news_articles").select("slug, updated_at").eq("is_published", true).limit(200),
    ]);
    for (const row of (tournaments ?? []) as { slug: string; updated_at: string }[]) {
      entries.push({ url: `${base}/tournaments/${row.slug}`, lastModified: new Date(row.updated_at), priority: 0.8 });
    }
    for (const row of (articles ?? []) as { slug: string; updated_at: string }[]) {
      entries.push({ url: `${base}/news/${row.slug}`, lastModified: new Date(row.updated_at), priority: 0.6 });
    }
  } catch {
    // sitemap still returns static paths if the database is unreachable
  }

  return entries;
}
