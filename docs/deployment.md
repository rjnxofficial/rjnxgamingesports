# Deployment

## 1. Website (Vercel, recommended)

The site is a standard Next.js 15 App Router app inside a workspace, so the
Vercel project needs a couple of overrides.

| Setting | Value |
| --- | --- |
| Root directory | **repository root** (the monorepo `vercel.json` sits here) |
| Framework preset | Next.js |
| Install command | `npm ci` |
| Build command | `npm run build --workspace @rjnx/web` |
| Output directory | `apps/web/.next` |
| Node version | 24.x |

`vercel.json` in the repository root pins these values, so a plain
`vercel link` + `vercel deploy` (or the CI job) builds correctly without manual
overrides. It also sets the `bom1` region and security headers.

Environment variables (Production + Preview):

```
NEXT_PUBLIC_SUPABASE_URL=https://nuckewrlcjphjmnfgilo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
NEXT_PUBLIC_SITE_URL=https://rjnxgamingesports.com
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
# Optional payments module — leave empty to keep entry fees offline/manual.
RAZORPAY_KEY_ID=<optional>
RAZORPAY_KEY_SECRET=<optional>
RAZORPAY_WEBHOOK_SECRET=<optional>
```

`SUPABASE_SERVICE_ROLE_KEY` and the Razorpay secrets are read through
`serverEnv()` inside `"server-only"` modules — they never enter the client bundle.

### Custom domain

1. Vercel → Project → Domains → add `rjnxgamingesports.com` and `www`.
2. Point DNS (`A`/`CNAME`) as Vercel instructs.
3. Update Supabase → Authentication → URL configuration to the final domain.

### CI deploy

`.github/workflows/website.yml` runs typecheck → tests → lint → static database
audit → production build → **live smoke test against `next start`** on every
push/PR. On `main` (and only when the secrets exist) it deploys to production,
then runs `apps/web/scripts/smoke.mjs` against the deployed URL, which asserts
`/api/health` reports a reachable database, all 15 public routes answer 200, the
dashboard routes redirect anonymous visitors to `/login`, and all 15 admin
routes are gated without 5xx.

A missed database problem therefore fails the deploy job with an annotation
naming the exact table or RPC.

### Required Supabase project setting (this is not a code change)

The app talks to the `rjnx` schema, so PostgREST must expose it:

> Supabase dashboard → Project Settings → API → **Exposed schemas** →
> add `rjnx` → Save (this reloads PostgREST).

Equivalent SQL with the service role:

```sql
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, rjnx';
notify pgrst, 'reload config';
```

**This is automated.** Migration `0009_expose_schema_via_config.sql` performs the
two statements above (`ALTER ROLE authenticator`, `NOTIFY pgrst`) whenever it is
applied, so the migration job fixes the project without a dashboard visit. It is
idempotent, appends `rjnx` without dropping schemas the instance already
exposes, and reports a notice instead of aborting when the migration role may not
alter `authenticator` — in that case use the dashboard toggle or the SQL above.

Migration `0008_expose_schema.sql` grants everything else that is needed
(schema usage, sequence/default privileges, anon read grants, view grants). Until
the schema is exposed, every query fails with
`PGRST106: Invalid schema: rjnx` and `/api/health` reports `database: "error"`;
CI prints that remediation directly in the failing check annotation.

### Secrets

| Secret | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` | build-time public config |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | production deploy |
| `DATABASE_URL` | migrations in `database.yml` |

If the Vercel secrets are absent the deploy step is skipped with a notice — the
quality gate still runs, so CI never fails because of missing hosting config.

## 2. Database

`.github/workflows/database.yml`:

* **inspect** job — always runs `npm run db:check` (read-only) when
  `DATABASE_URL` is configured.
* **migrate** job — runs `npm run db:push` when files under
  `supabase/migrations/**` change on `main`.
* **seed** — `workflow_dispatch` checkbox, applies `supabase/seed.sql`.

Without the `DATABASE_URL` secret both jobs print a notice and exit cleanly.

## 3. Android app

See [docs/apk.md](./apk.md) — GitHub Actions builds a signed APK + AAB and
uploads them as artifacts; EAS is available via `workflow_dispatch`.

## 4. Release checklist

```bash
npm ci
npm run verify                # typecheck + lint + tests + production build
npm run typecheck -w @rjnx/mobile
cd apps/mobile && npx expo export --platform android   # bundle sanity
```

- [ ] migrations applied to the production database (`db:check` shows every file applied)
- [ ] `bootstrap_super_admin` run once; you can sign in and open `/admin`
- [ ] Supabase redirect URLs include the production domain and `rjnx://auth/callback`
- [ ] Vercel env vars set (public + service role)
- [ ] `/api/health` returns `status: "ok"`
- [ ] Android artifact downloaded, installed on a device, login + registration tested
- [ ] Razorpay remaining disabled unless legal/compliance sign-off exists

## 5. Rollback

* Website: Vercel → Deployments → promote the previous build (instant).
* Database: migrations are additive and idempotent; keep a Supabase daily backup
  before structural changes (`0005` only adds a function).
* Android: keep the previous artifact (GitHub Actions artifacts are retained 30
  days) and re-upload it in Play Console if a release misbehaves.
