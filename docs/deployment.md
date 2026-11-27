# Deployment

## 1. Website (Vercel, recommended)

The site is a standard Next.js 15 App Router app inside a workspace, so the
Vercel project needs a couple of overrides.

| Setting | Value |
| --- | --- |
| Root directory | `apps/web` |
| Framework preset | Next.js |
| Install command | `cd ../.. && npm ci` |
| Build command | `cd ../.. && npm run build -w @rjnx/web` |
| Output directory | `.next` (default) |
| Node version | 22.x |

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

`.github/workflows/website.yml` runs typecheck → tests → lint → build on every
push/PR, uploads the build output, and (on `main`, when the secrets exist)
deploys to production and smoke-tests `/api/health`:

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
