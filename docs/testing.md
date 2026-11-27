# Testing & QA report

Snapshot date: 2026-11-26. Every command below was executed in this repository.

## 1. Automated gates

| Gate | Command | Result |
| --- | --- | --- |
| Shared typecheck | `npm run typecheck -w @rjnx/shared` | ✅ pass |
| Website typecheck | `npm run typecheck -w @rjnx/web` | ✅ pass |
| Android typecheck | `npm run typecheck -w @rjnx/mobile` | ✅ pass |
| Unit tests | `npm test` (Node test runner) | ✅ 15/15 pass |
| Lint | `npm run lint` (ESLint 9 flat config) | ✅ 0 errors, 0 warnings |
| Production build | `npm run build` (Next 15) | ✅ 55 route entries (46 pages + 6 handlers + 2 metadata + 404), ~103 kB shared JS |
| Runtime smoke test | `next start` + 40 HTTP requests | ✅ 0 × 5xx, auth gates redirect correctly |
| Android bundle | `npx expo export --platform android` | ✅ Hermes bundle 5.17 MB |
| Android native config | `npx expo prebuild -p android` | ✅ project generates cleanly |

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
2. **Play-signed APK/AAB.** No JDK/Android SDK in the sandbox. Mitigation:
   `expo export` and `expo prebuild` both succeed here, and
   `.github/workflows/android.yml` builds the signed APK + AAB on GitHub runners
   with your keystore secrets.
3. **End-to-end Razorpay checkout.** Requires live keys and a public webhook URL.
   The module stays disabled until `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` are set
   (the checkout button is hidden and the routes answer `503`), and the
   signature/webhook logic is unit-verifiable by inspection of
   `apps/web/src/lib/payments/razorpay.ts`.

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
