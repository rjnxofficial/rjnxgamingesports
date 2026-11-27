# Local setup — RJNX GAMING ESPORTS

Monorepo layout:

```
apps/
  web/      Next.js 15 App Router site + admin command center + API routes
  mobile/   Expo SDK 54 Android app (bottom-tab native UI, no WebView)
packages/
  shared/   Types, Zod validation, scoring engine (pure TS, unit tested)
supabase/
  migrations/  0001 core schema → 0004 public views
  seed.sql     reference data (games, scoring rules, settings, demo tournament)
docs/       this documentation set
```

## 1. Requirements

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | ≥ 20.9 (22 LTS tested) | Next 15, Expo 54 |
| npm | ≥ 10 | workspaces + committed lockfile |
| Supabase project | any plan | database, auth, storage |
| (optional) PostgreSQL client | — | `npm run db:push` needs `DATABASE_URL` |
| (optional) Java 17 + Android SDK | — | local APK builds; CI does this for you |

## 2. Install

```bash
git clone https://github.com/rjnxofficial/rjnxgamingesports.git
cd rjnxgamingesports
npm install          # installs web + mobile + shared (workspaces)
```

`npm ci` is used in CI — the lockfile at the repository root is committed and
covers every workspace.

## 3. Environment

The website and the Android app talk to the **same** Supabase project, so both
env files carry the same URL and publishable key.

```bash
cp .env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

Fill in:

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | web | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | publishable key (RLS-protected) |
| `NEXT_PUBLIC_SITE_URL` | web | `http://localhost:3000` locally |
| `SUPABASE_SERVICE_ROLE_KEY` | web (server only) | enables admin fallbacks, push fan-out, payments |
| `DATABASE_URL` | web (scripts only) | migrations and the DB inspector |
| `RAZORPAY_*` | web (server only) | optional payments module |
| `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | mobile | same project |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | mobile | only needed for push tokens / EAS builds |

Never put the service role key, database password, Razorpay secret or keystore
password in a `NEXT_PUBLIC_`/`EXPO_PUBLIC_` variable, and never commit `.env`
files. `.gitignore` blocks them; only `*.env.example` is tracked.

## 4. Database

```bash
# 1. Inspect what already exists (read-only)
DATABASE_URL="postgresql://postgres:PW@db.<ref>.supabase.co:5432/postgres" npm run db:check

# 2. Apply migrations (idempotent, tracked in rjnx.schema_migrations)
DATABASE_URL="…" npm run db:push

# 3. Optional reference data
DATABASE_URL="…" npm run db:push -- --with-seed
```

Full details, including what to do about pre-existing tables:
[docs/supabase-setup.md](./supabase-setup.md).

## 5. Run

```bash
npm run dev            # website on http://localhost:3000
npm run mobile         # Expo dev server (press "a" for Android)
npm run build          # production website build
npm run typecheck      # shared + web + mobile
npm run lint           # ESLint 9 flat config (web)
npm test               # scoring engine unit tests
npm run verify         # typecheck + lint + test + build
```

## 6. First super admin

Roles cannot be self-assigned. Bootstrap once:

1. Register a normal account through `/register`.
2. In the Supabase SQL editor run:

   ```sql
   select rjnx.bootstrap_super_admin('you@example.com');
   ```

3. Sign out and back in — `/admin` unlocks. From then on roles are granted from
   **Admin → Users** (super admin only).

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Missing environment variable …` | env file is missing or the key is shorter than 8 chars |
| Blank tournament list | run the migrations + seed; check RLS policies applied (`npm run db:check`) |
| `permission denied for schema rjnx` | publishable key used with the `public` schema; the clients pin `db.schema = "rjnx"` |
| Expo bundling error about `require.context` | run `npx expo start --clean` once; a stale Metro cache is the usual cause |
| Fonts not applied | rebuild after editing `assets/fonts` — fonts are bundled, not downloaded |
