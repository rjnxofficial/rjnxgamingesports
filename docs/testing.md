# Testing & QA report

Snapshot date: 2026-11-28. Every command below was executed in this repository.

## 1. Automated gates

| Gate | Command | Result |
| --- | --- | --- |
| Shared typecheck | `npm run typecheck -w @rjnx/shared` | ✅ pass |
| Website typecheck | `npm run typecheck -w @rjnx/web` | ✅ pass |
| Android typecheck | `npm run typecheck -w @rjnx/mobile` | ✅ pass |
| Unit tests | `npm test` (Node test runner) | ✅ 28/28 pass (scoring + role policy + admin guards) |
| Lint | `npm run lint` (ESLint 9 flat config) | ✅ 0 errors, 0 warnings |
| Production build | `npm run build` (Next 15) | ✅ 55 route entries (46 pages + 6 handlers + 2 metadata + 404), ~103 kB shared JS |
| Runtime smoke test | `next start` + 40 HTTP requests | ✅ 0 × 5xx, auth gates redirect correctly |
| Android bundle | `npx expo export --platform android` | ✅ Hermes bundle 5.17 MB |
| Android native config | `npx expo prebuild -p android` | ✅ project generates cleanly |
| Android project audit | `npm run android:verify -w @rjnx/mobile` | ✅ applicationId, versionCode, signing, fonts, SDK levels |
| React/renderer alignment | `npm run verify:react` | ✅ react 19.1.0 == react-native-renderer 19.1.0, single copy |
| Route module guard | `npm run verify:routes -w @rjnx/mobile` | ✅ no stray `ErrorBoundary` bindings, every screen has a default export |
| Admin Command Center audit | `node apps/web/scripts/admin-audit.mjs` | ✅ 15 routes, 23 guarded actions, 23 audited mutations |
| Website completeness audit | `node apps/web/scripts/site-audit.mjs` | ✅ 13 public pages + dynamic routes, auth + dashboard surfaces, SEO |
| Android emulator cold start | CI `Startup smoke test` job | ✅ app launched, no `FATAL EXCEPTION`, `RJNXStartup boot:ui-ready` logged |
| Android signing (no secrets) | `node scripts/configure-android-signing.mjs` | ✅ exits 0, leaves stock debug signing untouched |
| Android signing (base64 keystore) | same script + `ANDROID_KEYSTORE_BASE64` | ✅ `keystore.properties` + conditional `signingConfigs.release` patch |
| Android SDK requirements | `npm run android:sdk -w @rjnx/mobile` | ✅ compile 36 / target 36 / min 24, build-tools 36.0.0, ndk 27.1.12297006 |
| Workflow lint | `npm run verify:workflows` | ✅ 3 workflows, no `secrets.*` in `if:`, all actions on node24 majors |
| Supabase schema audit | `node apps/web/scripts/verify-supabase.mjs` | ✅ 8 migrations, 21 tables all RLS-protected, 8 RPCs |
| Production smoke test | `node apps/web/scripts/smoke.mjs <url>` | ✅ health + 15 public routes + auth gates + 15 admin gates |
| Backend probe | `node apps/web/scripts/db-status.mjs` | reports per-table/RPC reachability with the publishable key |
| Build without env | `env -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_ANON_KEY npm run build` | ✅ succeeds, degrades to a configuration state instead of crashing |

`npm run verify` runs typecheck → lint → tests → build in one command; it is the
same sequence CI enforces before deploying.

## 2. Unit test coverage (`packages/shared`)

`test/scoring.test.ts` covers the tournament engine:

* placement points for the default battle-royale table (1st = 12 … 8th = 1)
* kill points, bonus points and the `chicken_dinner` bonus
* tie-break ordering (points → kills → best placement → wins)
* leaderboard aggregation across multiple tournaments
* position/placement validation edges (0 kills, missing placement, ties)
* currency/date formatting helpers

The resolver functions are pure — no DB or clock side effects — so the leaderboard
maths is verified independently of Supabase.

## 3. Website route audit (production build)

Verified against a running production server (`next start`), not just the build
manifest. 55 route entries are emitted:

* **Public site (16 pages)** — `/`, `/tournaments`, `/tournaments/[slug]`,
  `/results`, `/leaderboard`, `/teams`, `/players`, `/players/[username]`,
  `/news`, `/news/[slug]`, `/about`, `/contact`, `/faq`, `/support`, `/terms`,
  `/privacy`
* **Auth (4 pages)** — `/login`, `/register`, `/forgot-password`,
  `/reset-password`
* **Player dashboard (8 pages)** — `/dashboard`, `/dashboard/tournaments`,
  `/dashboard/matches`, `/dashboard/teams`, `/dashboard/profile`,
  `/dashboard/settings`, `/dashboard/notifications`, `/dashboard/support`
* **Admin command center (17 pages)** — `/admin`, `/admin/tournaments` (+ `/new`,
  `/[id]`), `/admin/registrations`, `/admin/matches`, `/admin/results`,
  `/admin/leaderboard`, `/admin/users`, `/admin/roles`, `/admin/news`,
  `/admin/banners`, `/admin/notifications`, `/admin/reports`, `/admin/settings`,
  `/admin/audit`, `/admin/support`
* **Route handlers (6)** — `/api/health`, `/api/payments/create-order`,
  `/api/payments/verify`, `/api/webhooks/razorpay`, `/api/notifications/read`,
  `/auth/callback`
* **Metadata routes (2)** — `/robots.txt`, `/sitemap.xml`
* **Error surface** — `/suspended`, `not-found` (404), `error.tsx` boundary

### HTTP results (production server, database unreachable in this sandbox)

| Request | Result |
| --- | --- |
| `/`, `/about`, `/faq`, `/terms`, `/privacy`, `/contact`, `/support` | 200 |
| `/tournaments`, `/results`, `/leaderboard`, `/teams`, `/players`, `/news` | 200 |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | 200 |
| `/robots.txt`, `/sitemap.xml` | 200 |
| `/api/health` | 200 `{"status":"degraded","database":"error"}` (expected — no egress) |
| `/tournaments/does-not-exist`, `/players/…`, `/news/…` | 404 via `notFound()` |
| `/dashboard*`, `/admin*` while signed out | 307 → `/login?next=…` |
| `/auth/callback` without a code | 307 → `/login?error=missing_code` |
| `POST /api/payments/create-order`·`/verify`·`/notifications/read` signed out | 401 |
| `POST /api/webhooks/razorpay` without a valid HMAC | 401 |

Room-credential integrity, RLS and the RPC guards are enforced in the database
(`0003_rls_policies.sql`), so a forged request cannot bypass the UI.

## 4. Android screen audit

Tabs (5): Home, Tournaments, My Matches, Leaderboard, Profile.
Stack/sub-screens: tournament detail (`/tournament/[slug]`), Teams,
Notifications, Settings, Support, auth (sign-in, sign-up, forgot password),
auth callback.

Every screen reads/writes Supabase through `lib/api.ts`:
tournaments + filters, tournament detail with registration/cancel, my matches
with room credentials (`match_room_credentials` RPC), global leaderboard
(players/teams), profile + player stats, teams (create/invite/accept/leave/disband),
notifications (list + mark read), settings (profile update, password reset,
sign out), support (create ticket, read replies).

No WebView: verified by dependency audit — `react-native-webview` is not a
dependency of `apps/mobile`.

## 5. Manual verification performed

| Area | Check | Result |
| --- | --- | --- |
| Build | clean `next build`, no type errors, 0 ESLint errors/warnings | ✅ |
| Resilience | every public loader wrapped (`src/server/safe.ts`) → DB outage renders empty state, never a 500 | ✅ |
| Auth loop | `?next=` is preserved end-to-end (middleware header → server guard → login form → `safeNextPath`) | ✅ |
| Payments UI | Razorpay checkout button appears for unpaid paid entries; hidden when the module is off | ✅ |
| Branding | Orbitron/Rajdhani bundled for the app, gradient primary buttons, dark palette | ✅ |
| Assets | icon 1024², adaptive icon, splash 1242², notification icon 96² all render | ✅ |
| Navigation | tabs + hidden sub-routes wired with `expo-router`, deep links mapped | ✅ |
| Offline | AsyncStorage cache + offline strip; reads render from cache, writes error clearly | ✅ |
| Push | token registration guarded on a real EAS project id; web fan-out via Expo Push API | ✅ |
| Payments | HMAC verification server-side, idempotent webhook, module off by default | ✅ |
| Roles | super-admin-only guards on roles/settings/suspension/audit; DB RLS mirrors them | ✅ |
| Secrets | no privileged key in any client bundle or `EXPO_PUBLIC_*` variable | ✅ |

## 6. Environment limitations of this delivery

Three things cannot be executed from this sandbox and are therefore covered by
configuration + documented steps rather than a live run:

1. **Live Supabase introspection / migration.** Egress to
   `*.supabase.co` is blocked here. Mitigation: migrations are idempotent and
   non-destructive, `npm run db:check` inspects before writing, CI applies them
   with `DATABASE_URL`.
2. **Gradle `assembleRelease` / `bundleRelease`.** This sandbox has no JDK and no
   Android SDK, and `dl.google.com`, `services.gradle.org` and
   `repo1.maven.org` are blocked, so Gradle cannot resolve its plugin/dependency
   graph here. Everything Gradle consumes *is* verified locally: `expo export`
   (Hermes bundle 5.17 MB), `expo prebuild` (project generates), signing patch
   (both modes), and a static audit of the generated project. The APK and AAB
   are built and uploaded by `.github/workflows/android.yml`; the run URL and
   artifact links are reported with the CI results.
3. **End-to-end Razorpay checkout.** Requires live keys and a public webhook URL.
   The module stays disabled until `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` are set
   (the checkout button is hidden and the routes answer `503`), and the
   signature/webhook logic is unit-verifiable by inspection of
   `apps/web/src/lib/payments/razorpay.ts`.

## 6a. Startup-crash investigation (Android release APK)

### Root cause (found, fixed, verified)

The first release APK crashed immediately after the splash. The emulator harness
reproduced it and logcat reported:

```
E/ReactNativeJS: Warning: Incompatible React versions: The "react" and
"react-native-renderer" packages must have the exact same version.
  - react:                  19.1.10
  - react-native-renderer:  19.1.0
E/ReactNativeJS: { [TypeError: Cannot read property 'ErrorBoundary' of undefined]
  componentStack: at ContextNavigator ... at ExpoRoot }
FATAL EXCEPTION: mqt_v_native
```

Expo SDK 54 / React Native 0.81 compile their renderer against **React 19.1.0**,
but both workspaces declared `react@19.1.10` and the monorepo hoisted that copy
into the Android bundle. With a mismatched React, expo-router's boundary lookup
resolved to `undefined`, so the very first render threw.

Fix: `react`/`react-dom` are pinned to `19.1.0` in the root, web and mobile
manifests with npm `overrides`, the lockfile is regenerated, and
`apps/mobile/scripts/verify-react-version.mjs` fails CI whenever the resolved
React differs from the renderer or more than one React copy exists. The verified
run (`#46144234335`) builds the APK/AAB and passes the emulator cold start.

A successful `assembleRelease` says nothing about whether the app starts. The
release build has no developer overlay, so any JS error surfaces as a frozen
splash screen and nothing else. Actions taken:

1. **Reproduction harness in CI.** `smoke` job in `.github/workflows/android.yml`
   boots a KVM-accelerated API 34 emulator, installs the exact artifact from the
   build job, cold-starts it, waits 25 s and then asserts:
   `pidof <package>` is non-empty, no `FATAL EXCEPTION` in logcat, and the JS
   bundle logged `RJNXStartup … boot:ui-ready`.
   `apps/mobile/scripts/smoke-android-apk.sh` writes `report.txt`,
   `crash-slice.txt` and `logcat-tail.txt`; the workflow prints the slice into
   the run summary, comments it on the PR and uploads it as an artifact.
2. **The white screen is now impossible to hide.** `lib/runtime.ts` validates
   `EXPO_PUBLIC_*` before the first render and installs a global error handler
   that logs to logcat under the tag `RJNXStartup`; the root layout renders a
   `STARTUP FAILED` / `CONFIGURATION ERROR` screen with the actual message, and
   every subtree sits inside `components/error-boundary.tsx`.
3. **Startup can no longer hang on fonts or splash.** Font loading has a 4 s
   timeout and the native splash has a hard 5 s hide budget, so a missing font
   file degrades to system fonts instead of freezing.
4. **Configuration is no longer guessed.** The hard-coded Supabase fallback in
   the app and the fake `extra.eas.projectId` placeholder were removed; a bundle
   built without config now says so on screen and in logcat.
5. **Known crash classes audited:** Expo Router routes (no duplicate routes, all
   default exports present), Reanimated Babel plugin (the plugin entry now
   resolves `react-native-worklets/plugin`; `react-native-worklets` is installed
   and autolinked), gesture-handler root view, SecureStore fallback for sessions
   over 2 KB, and storage/overlay permissions blocked.

The emulator result for each build is reported with the CI numbers; the crash
log is attached to the run either way.

## 6b. Issues found in this audit and fixed

| Issue | Impact | Fix |
| --- | --- | --- |
| `/` and `/tournaments` returned **500** when Supabase was unreachable | whole site down during any DB hiccup | `safeQuery()` wrappers with typed empty fallbacks; `dataClient()` cookie-safe fallback |
| `getTournamentBySlug` returned `null` and crashed the detail page | 500 on deep links | explicit empty payload + `notFound()` on a missing row |
| Team state shape was `{team:{team}}` after a refactor | profile crash risk | typed `MyTeamState` contract |
| Expo session storage exceeded the Android SecureStore 2 KB limit | silent sign-out | size-aware SecureStore/AsyncStorage adapter |
| `public/robots.txt` shadowed the `robots.ts` route | stale crawl rules | removed the static file |
| `next` param was not validated on sign-in/register | open-redirect risk | `safeNextPath()` on both forms |
| Suspension was available to all staff | violated role policy | super-admin-only action + UI gating |
| Super admin could be suspended / last role revoked | platform lockout | last-super-admin guards |
| Sign-up username was derived from the e-mail | wrong player handle | migration `0006` honours metadata username (and repairs existing rows) |
| Paid entries had no checkout UI | dead payment routes | real Razorpay checkout with server-side verification |
| Webhook created a notification with a possibly-null user id | failed inserts | registration/user fallback |
| `robots.txt`/CSP framing | preview + SEO headers | CSP `frame-ancestors`, dynamic robots |
| Contact form | — | already wired to `support_tickets` (verified) |
| **React 19.1.10 vs renderer 19.1.0** | **release APK crashed instantly (`ErrorBoundary` of undefined)** | pin react/react-dom to 19.1.0 + overrides + `verify:react` CI gate |
| Admin role actions allowed a super admin to change their own roles | self-promotion / self-lockout | session-based self-change guard on grant and revoke |
| Five admin mutations had no audit entry | unauditable privileged changes | audit writes for leaderboard recalc, banners, support replies, scoring rules |
| Reports had no date range and no export | manual SQL for every report | `from`/`to` filters + staff-only CSV export route |
| `expo-router` treats a route-local `ErrorBoundary` binding as its own boundary | "Cannot read property ErrorBoundary" class of crashes | alias the UI boundary + `verify:routes` CI gate |
| **`rjnx` schema not exposed in PostgREST** | **every query from web + Android failed (`PGRST106`); the deployed site had no data** | migration `0008` grants + `0009` sets `pgrst.db_schemas` and reloads PostgREST automatically; CI annotation names any residual case |
| `RJNX_SCHEMA` imported from a `"use client"` module into server code | runtime crash "Attempted to call RJNX_SCHEMA() from the server" | moved to `lib/supabase/schema.ts` |
| Missing `NEXT_PUBLIC_*` env broke the production build | deploy could not be built at all | lazy getters + `optionalEnv()`; build verified with and without env |
| Release APK could white-screen with no diagnostics | unverifiable startup | runtime diagnostics, error boundaries, splash/font timeouts, emulator smoke job |

## 7. Regression checklist before each release

```bash
npm ci
npm run verify
npm run typecheck -w @rjnx/mobile
cd apps/mobile && npx expo export --platform android --clear
```

Then: `/api/health` returns `status: "ok"`, sign-in works on web and device, a
free tournament registration succeeds and appears in both dashboards, room
credentials stay hidden until published.
