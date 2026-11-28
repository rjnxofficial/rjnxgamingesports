<div align="center">

# RJNX GAMING ESPORTS

### BE SAVAGE. NOT AVERAGE.

Production tournament platform for the Indian esports circuit — website, admin
command center and a native Android app, sharing one Supabase backend.

Developed by **DEVKAZZU** · Built with Next.js 15 · React 19 · Expo 54

</div>

---

## What is in here

| Surface | Stack | Location |
| --- | --- | --- |
| Website + admin | Next.js 15 (App Router), React 19, TypeScript, Tailwind 4, Framer Motion, Lucide, Zod | `apps/web` |
| Android app | Expo SDK 54, React Native 0.81, expo-router 6, TypeScript — native UI, no WebView | `apps/mobile` |
| Domain engine | Types, Zod validation, scoring/leaderboard maths (unit tested) | `packages/shared` |
| Database | Supabase (Postgres) schema `rjnx`, RLS on every table, RPCs, views | `supabase/` |

## Features

**Players** — browse tournaments with filters, register (solo/duo/squad),
create or join teams, receive invitations, view schedules and room credentials,
track results, climb the global leaderboard, profile with IGN/UID, notifications,
support tickets.

**Admins** — command center at `/admin`: tournaments, bracket generation, match
scheduling, room publishing, result entry + verification, leaderboard
recalculation, registrations review, users, roles, news, banners, broadcasts,
reports, platform settings, audit log, support inbox.

**Roles** — `player` → `moderator` → `tournament_manager` → `admin` →
`super_admin`. Only a super admin can assign roles, change platform settings,
suspend users or read the audit log. Self-promotion is impossible (UI guards +
database policies + `is_super_admin()` checks).

**Android app** — bottom navigation (Home / Tournaments / My Matches /
Leaderboard / Profile), push notifications, deep links, offline cache, bundled
brand fonts, package `com.devkazzu.rjnxgamingesports`.

## Quick start

```bash
git clone https://github.com/rjnxofficial/rjnxgamingesports.git
cd rjnxgamingesports
npm install

cp .env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env    # fill the Supabase URL + publishable key

DATABASE_URL="postgresql://postgres:PW@db.<ref>.supabase.co:5432/postgres" npm run db:push

npm run dev        # website → http://localhost:3000
npm run mobile     # Expo dev server (press "a" for Android)
```

Full instructions: **[docs/setup.md](./docs/setup.md)**.

## Repository layout

```
apps/
  web/        Next.js site, player dashboard, admin command center, API routes
  mobile/     Expo Android app (screens, lib, assets, EAS + signing scripts)
packages/
  shared/     types · validation · scoring engine · utils (+ tests)
supabase/
  migrations/ 0001 core schema → 0005 admin bootstrap
  seed.sql    games, scoring rules, settings, demo tournament
docs/         setup · deployment · supabase-setup · apk · api · admin · testing
.github/workflows/
  website.yml   typecheck · lint · tests · build · (guarded) Vercel deploy
  database.yml  read-only inspection · migrations · optional seed
  android.yml   typecheck · APK + AAB artifacts · optional EAS build
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | website dev server |
| `npm run build` | production website build |
| `npm run mobile` | Expo dev server |
| `npm run typecheck` | shared + web + mobile |
| `npm run lint` | ESLint (web) |
| `npm test` | shared unit tests (15) |
| `npm run verify` | typecheck + lint + test + build |
| `npm run db:check` | read-only database inspection |
| `npm run db:push` | apply migrations (add `-- --with-seed` for data) |

## Documentation

* [Setup](./docs/setup.md) — local environment, env vars, first super admin
* [Android APK / AAB](./docs/apk.md) — building, signing, Play Store release
* [Supabase setup](./docs/supabase-setup.md) — schema, migrations, RLS, auth config
* [API reference](./docs/api.md) — routes, actions, payments, errors
* [Admin guide](./docs/admin.md) — roles, pages, operational workflows
* [Deployment](./docs/deployment.md) — Vercel, CI secrets, release checklist
* [Testing report](./docs/testing.md) — gates, coverage, audits, limitations
* [Delivery report](./docs/DELIVERY-REPORT.md) — verdict per requirement, remaining owner actions

## Security notes

* Only publishable/anon keys reach the browser or the app; every privileged
  operation runs on the server with `SUPABASE_SERVICE_ROLE_KEY`
  (`"server-only"` modules).
* RLS is enabled on every `rjnx` table; grants are explicit per role.
* Razorpay signatures are verified with HMAC-SHA256 and constant-time comparison;
  the checkout amount always comes from the database, never the client.
* Keystores, keystore passwords, service role keys and provider secrets live in
  CI/GitHub secrets or local env files — never in the repository.
* Real-money deposits, withdrawals and automated prize payouts are intentionally
  disabled pending legal/compliance review.

## License

Proprietary — © RJNX GAMING ESPORTS. Developed by DEVKAZZU. All rights reserved.
