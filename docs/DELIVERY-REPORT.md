# RJNX GAMING ESPORTS — Delivery Report

**DEVKAZZU · “BE SAVAGE. NOT AVERAGE.”**
Repository: `github.com/rjnxofficial/rjnxgamingesports`
Branch: `arena/f215ecde-rjnxgamingesports` → PR **#3**
Report date: 2026-11-28

---

## 1. Verdict

| Area | Status | Evidence |
| --- | --- | --- |
| Android release build (APK + AAB) | ✅ **Green** | run `46149408104`, jobs `Release APK + AAB` + `Startup smoke test (emulator)` |
| Android cold start (no crash) | ✅ **Verified on emulator** | job `Startup smoke test (emulator) (configured, configured): success` |
| Web code quality (types, lint, unit, audit, build) | ✅ **Green** | `npm run verify` exit 0 locally; Website CI run `46149408119` all steps up to the smoke test |
| Database migrations | ✅ **Green (static)** | `46149408069` / validate job: `✓ 9 migrations, 21 tables, 8 RPCs` |
| Live website deploy | ⛔ **Blocked — owner action** | no `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` in the repo |
| Database reachable from web | ⛔ **Blocked — owner action** | `PGRST106`, only `public, graphql_public` exposed; no `DATABASE_URL` secret so 0009 cannot apply itself |

Everything that can be fixed from inside the repository **is fixed and pushed**.
The two remaining items are secrets/settings that only the project owner can add —
they cannot be created from code, and the pipeline names them explicitly on every run.

---

## 2. The Android crash (highest priority) — root cause and fix

**Symptom:** the release APK closed immediately after the splash screen.

**Reproduction:** the CI emulator harness installs the release APK, launches the
activity and captures logcat before/after (`apps/mobile/scripts/smoke-android-apk.sh`).

**Captured FATAL:**

```
E/ReactNativeJS: Warning: Incompatible React versions: The "react" and
  "react-native-renderer" packages must have the exact same version.
  - react:                  19.1.10
  - react-native-renderer:  19.1.0
E/ReactNativeJS: TypeError: Cannot read property 'ErrorBoundary' of undefined
  componentStack: at ContextNavigator ... at ExpoRoot
FATAL EXCEPTION: mqt_v_native
```

**Root cause:** Expo SDK 54 / React Native 0.81 ship a renderer compiled against
React **19.1.0**. Both workspaces declared `react@19.1.10` and the monorepo
hoisted that copy into the Android bundle. With mismatched versions,
expo-router's error-boundary lookup returned `undefined` on the very first
render, which is a hard crash, not a rendering glitch.

**Fix (shipped):**
1. `react` and `react-dom` pinned to **19.1.0** in the root, `apps/web` and
   `apps/mobile` manifests, plus npm `overrides` so no transitive dependency can
   reintroduce a second copy. `react-dom` removed from the mobile app entirely.
2. `apps/mobile/scripts/verify-react-version.mjs` (`npm run verify:react`) fails
   the build if the Metro-resolved React differs from the renderer version or if
   more than one React copy exists.
3. `apps/mobile/scripts/verify-bundle-exports.mjs` (`npm run verify:routes`)
   guards the second failure mode: a screen exporting its own `ErrorBoundary`
   binding, which expo-router treats as its own boundary.
4. Startup diagnostics added: each boot milestone is logged (`RJNXStartup
   boot:*`), a visible error screen replaces blank screens, and unhandled
   rejections are reported. Nothing is swallowed — errors surface.

**Verification:** the bundle now contains exactly one React (`{ '19.1.0': 7 }`),
and the emulator smoke test passes only when the app reaches `ui-ready` with no
fatal exception. Green run: **`46149408104`** on commit `efc9e4f`.

Artifacts from that run:

* `rjnx-esports-apk` — 33 MB (release APK)
* `rjnx-esports-aab` — 53 MB (Play Store bundle)
* `rjnx-startup-logcat-configured` — emulator logcat capture

---

## 3. Admin Command Center

15 routes, all reading and writing the real Supabase project through the `rjnx`
schema — no dummy data, no placeholder handlers.

`/admin` · `tournaments` · `registrations` · `matches` · `results` ·
`leaderboard` · `users` · `roles` · `news` · `banners` · `notifications` ·
`reports` · `settings` · `audit` · `support`

* **Auth:** Supabase session, resolved server-side; every page re-checks the
  session and role (not just middleware).
* **Roles:** `super_admin`, `admin`, `moderator`, `editor`, `support`, `player`.
  Permission matrix lives in `packages/shared`; the UI hides nothing that the
  server does not also refuse.
* **Self-change guard:** a super admin can no longer change their own roles
  (previously allowed self-promotion / self-lockout).
* **Audit:** every privileged mutation writes an `audit_logs` row (23 audited
  mutations). Five previously unaudited ones were fixed: leaderboard recalc,
  banners, support replies, scoring rules, and role changes.
* **Reports:** date-range filters (default: last 30 days) plus five CSV exports
  at `/admin/reports/export?dataset=…&from=…&to=…`, staff-only, `no-store`,
  refused for anonymous callers (asserted in the smoke test).
* **Regression gate:** `apps/web/scripts/admin-audit.mjs` runs in CI and fails
  the build if a page stops reading the database, an action loses its role
  guard, a mutation stops writing an audit row, or an error can no longer be
  reported. Current result: `✓ 15 routes, 23 guarded actions, 23 audited mutations`.

---

## 4. Supabase & database

* One project for both clients: `nuckewrlcjphjmnfgilo.supabase.co`, one schema
  (`rjnx`), configured through `EXPO_PUBLIC_*` (Android) and `NEXT_PUBLIC_*` (web).
* `SUPABASE_SERVICE_ROLE_KEY` is server-only. It is never referenced by the
  mobile app or any browser bundle; `/api/health` reports only whether it is
  `configured`, never its value, and the smoke test asserts no secret leaks.
* 9 migrations: core schema (21 tables), functions (8 RPCs), RLS policies on
  every table, public views, admin bootstrap, username handling, `SECURITY
  DEFINER` hardening, schema exposure grants, and **new `0009`**.
* Non-destructive by construction: migrations only create/extend; the runner
  records applied files in `rjnx.schema_migrations` and re-runs are no-ops.
  No `drop table`, no data reset.

### The `PGRST106` blocker — now self-healing

The Supabase “Exposed schemas” setting is not a table; it is PostgREST config —
literally `alter role authenticator set pgrst.db_schemas` + `notify pgrst,
'reload config'`. **Migration `0009_expose_schema_via_config.sql` now applies
that for you** (idempotent, additive — it never removes a schema the instance
already exposes, and it degrades to a notice instead of aborting when the
migration role may not alter `authenticator`).

It runs the moment the `DATABASE_URL` secret exists. That single secret fixes
both the missing migration and the schema exposure. Until then, the manual
equivalent is Project Settings → API → Exposed schemas → add `rjnx` → Save.

---

## 5. Tests run

`npm run verify` (exit 0, local, this branch):

| Gate | Result |
| --- | --- |
| Typecheck (shared + web + mobile) | ✅ |
| Lint (web) | ✅ |
| Unit tests | ✅ 28 pass / 0 fail |
| Workflow verification | ✅ 3 workflows |
| Route module check | ✅ no stray `ErrorBoundary`, every screen has a default export |
| React version alignment | ✅ 19.1.0 == renderer, single copy |
| Admin Command Center audit | ✅ 15 routes / 23 guarded / 23 audited |
| Website completeness audit | ✅ 13 public pages + dynamic routes, auth & dashboard surfaces, SEO |
| Production build | ✅ compiled, 10/10 static pages |

CI: Android **success**, Database validate **success**, Website CI **all steps
pass except the live smoke test**, which fails only because the database is
unreachable at the PostgREST level (the owner-side item above) — with the exact
annotation naming that cause.

---

## 6. What the owner must add (and nothing else)

| # | Item | Where | Unblocks |
| --- | --- | --- | --- |
| 1 | `DATABASE_URL` (Postgres URI, session pooler) | GitHub → Settings → Secrets → Actions | migrations + `rjnx` exposure (0009) + all data |
| 2 | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | same | automatic production deploy + post-deploy smoke test |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | same **and** Vercel env | admin bootstrap, server-only operations |
| 4 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` | Vercel env (repo secrets optional) | web runtime config |
| 5 | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Actions secrets for APK builds | Android data access (publishable key only) |
| 6 | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Actions secrets | production-signed APK (debug key is used as a fallback and labelled as such) |
| 7 | Real EAS `projectId` | `apps/mobile/app.json` → `extra.eas.projectId` | EAS builds |

I cannot create any of these: they are credentials, and the sandbox has no
outbound access to `api.supabase.com` or `vercel.com`, so the dashboard steps
cannot be performed from here. Nothing else is pending on my side.

### Production URL

Not yet available, because no Vercel credentials exist in the repository and
`Deploy to Vercel` is skipped by design (it reports a notice rather than failing
silently). The moment item 2 is added, the workflow deploys and prints the URL
in both the job output and the run summary, and then probes `/api/health` on that
URL. No manual step is needed after adding the secrets.

---

## 7. Commits in this delivery

```
efc9e4f ci(web): point the schema annotation at the automated 0009 fix
d755c35 feat(db): migration 0009 exposes the rjnx schema to PostgREST automatically
cf643be fix(scripts): add the root verify:routes alias so npm run verify completes
3d17f0c docs: record the Android root cause, the new audits and the report exports
e2539b9 test(web): website completeness audit (routes, data loaders, SEO, auth surfaces)
14e6422 feat(admin): date-range filters and real CSV exports for reports
b4cb9fc chore(scripts): root verify:react alias
19ef326 test(mobile): fail the build when React and the RN renderer disagree
145a2f4 fix(mobile): pin React to 19.1.0 to match the React Native renderer
```

Full history and diff: PR #3.
