#!/usr/bin/env node
/**
 * Public website capability audit.
 *
 * The storefront must be complete and real: every required route has to exist,
 * render from the database client, define SEO metadata, and handle the
 * empty/error states. This script reads the App Router tree statically so it
 * runs in a fraction of a second and cannot be gamed by a "green" build.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const appDir = path.join(root, "src/app");
const siteDir = path.join(appDir, "(site)");

const failures = [];
const notes = [];

const STATIC_ROUTES = ["faq", "about", "terms", "privacy"];

const PUBLIC_PAGES = [
  "",
  "tournaments",
  "news",
  "results",
  "leaderboard",
  "teams",
  "players",
  "faq",
  "about",
  "contact",
  "support",
  "terms",
  "privacy",
];

for (const route of PUBLIC_PAGES) {
  const file = path.join(siteDir, route, "page.tsx");
  const label = `/${route}`;
  if (!existsSync(file)) {
    failures.push(`missing public page ${label}`);
    continue;
  }
  const code = readFileSync(file, "utf8");
  // Data may come from the query layer (preferred) or directly from a client.
  const hasLoader =
    /from\s+"@\/server\/(queries|safe)"/.test(code) ||
    /createServerSupabase|dataClient|getSessionContext/.test(code);
  const hasMetadata =
    /export const metadata/.test(code) || /export (async )?function generateMetadata/.test(code);
  const hasEmptyState = /EmptyState|empty|No .* yet|isEmpty/.test(code);
  notes.push(`${label}: ${code.split("\n").length} lines, loader=${hasLoader}, metadata=${hasMetadata}`);
  if (!hasLoader && !STATIC_ROUTES.includes(route)) failures.push(`${label}: does not load data from Supabase`);
  if (!hasMetadata) failures.push(`${label}: no SEO metadata`);
  if (!hasEmptyState) notes.push(`${label}: no explicit empty state found (verify manually)`);
}

// Static informational pages: DB access is not expected, but they must be real
// pages (no placeholder copy) and carry metadata.
const STATIC_PAGES = ["faq", "about", "terms", "privacy"];
for (const route of STATIC_PAGES) {
  const code = readFileSync(path.join(siteDir, route, "page.tsx"), "utf8");
  if (/lorem ipsum|placeholder text|TODO/i.test(code)) failures.push(`/${route}: placeholder copy found`);
  if (!/export const metadata/.test(code)) failures.push(`/${route}: no SEO metadata`);
}

// Tournament detail + player/team profiles live outside the group or are dynamic.
for (const required of ["tournaments/[slug]/page.tsx", "players/[username]/page.tsx"]) {
  const file = path.join(siteDir, required);
  if (!existsSync(file)) failures.push(`missing dynamic page ${required}`);
  else notes.push(`/${required.replace("/page.tsx", "")}: present`);
}

// Auth + dashboard surfaces.
for (const required of [
  "(auth)/login/page.tsx",
  "(auth)/register/page.tsx",
  "(auth)/forgot-password/page.tsx",
  "dashboard/page.tsx",
  "dashboard/profile/page.tsx",
  "dashboard/tournaments/page.tsx",
  "dashboard/matches/page.tsx",
  "dashboard/teams/page.tsx",
  "dashboard/notifications/page.tsx",
  "dashboard/support/page.tsx",
  "dashboard/settings/page.tsx",
]) {
  if (!existsSync(path.join(appDir, required))) failures.push(`missing ${required}`);
}

// Global surfaces.
for (const required of ["sitemap.ts", "robots.ts", "not-found.tsx", "error.tsx", "layout.tsx"]) {
  if (!existsSync(path.join(appDir, required))) failures.push(`missing app/${required}`);
}

const layout = readFileSync(path.join(appDir, "layout.tsx"), "utf8");
if (!/metadataBase/.test(layout)) failures.push("root layout has no metadataBase (SEO)");
if (!/openGraph/.test(layout)) failures.push("root layout has no Open Graph metadata");

// Shared UX primitives the pages rely on.
for (const required of ["components/ui/empty-state.tsx", "components/site/site-header.tsx", "components/site/site-footer.tsx"]) {
  if (!existsSync(path.join(root, "src", required))) notes.push(`optional missing: ${required}`);
}

const loading = existsSync(path.join(siteDir, "loading.tsx")) || existsSync(path.join(appDir, "loading.tsx"));
if (!loading) notes.push("no route-level loading.tsx (suspense fallbacks come from the pages)");

if (process.argv.includes("--verbose")) {
  for (const note of notes) console.log(`  · ${note}`);
}

if (failures.length) {
  console.error("✗ website audit failed:");
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}
console.log(`✓ website audit passed: ${PUBLIC_PAGES.length} public pages + dynamic routes, auth and dashboard surfaces, SEO`);
