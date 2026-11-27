# Supabase setup

Project: `https://nuckewrlcjphjmnfgilo.supabase.co`
Schema: `rjnx` (nothing is created in `public`)

## 1. Inspect before you write

`npm run db:check --workspace @rjnx/web` is read-only. It prints:

* every schema in the database,
* tables + row counts for `public` and `rjnx`,
* which migration files are applied vs. present locally,
* tables that have RLS enabled and tables that do not.

Always run it against an existing project **before** `db:push`.

## 2. Migrations

| File | Contents |
| --- | --- |
| `0001_core_schema.sql` | enums, tables, indexes, constraints, triggers, `push_tokens`, `payment_transactions` |
| `0002_functions.sql` | helpers (`is_staff`, `is_super_admin`, `current_roles`), RPCs, views, leaderboard recalculation |
| `0003_rls_policies.sql` | RLS enabled on every table + grants |
| `0004_public_views.sql` | `tournament_slot_counts`, `public_player_stats`, `public_team_stats`, `public_platform_stats` |

Rules the migrations follow:

* `create table if not exists`, `create index if not exists`,
  `drop policy if exists … create policy …`, `create or replace function`
  → safe to re-run.
* No `drop table`, no `truncate`, no column removal. Existing rows are preserved.
* Everything is namespaced under `rjnx`; `auth.users` is only referenced.

The runner (`apps/web/scripts/db-setup.mjs`) wraps each file in a transaction and
records the filename in `rjnx.schema_migrations`, so a second run is a no-op.

```bash
DATABASE_URL="postgresql://postgres:PW@db.<ref>.supabase.co:5432/postgres" npm run db:push
DATABASE_URL="…" npm run db:push -- --with-seed
```

Alternative: paste each file into the Supabase SQL editor in order (0001 → 0004).

## 3. What the schema contains

Core tables: `profiles`, `user_roles`, `games`, `scoring_rules`, `tournaments`,
`teams`, `team_members`, `team_invitations`, `tournament_registrations`,
`matches`, `match_participants`, `match_results`, `leaderboard_entries`,
`notifications`, `news_articles`, `platform_settings`, `audit_logs`,
`support_tickets`, `banners`, `payment_transactions`, `push_tokens`.

Conventions: UUID primary keys (`gen_random_uuid()`), `created_at`/`updated_at`
via the `rjnx.touch_updated_at()` trigger, unique constraints on natural keys
(tournament slug, username case-insensitively, team name, `(tournament, user)`),
and FK indexes on every join column that is filtered in queries.

### RPC surface

| Function | Purpose |
| --- | --- |
| `register_for_tournament(tournament_id, team_id)` | slot allocation, capacity + eligibility checks, notifications |
| `cancel_registration(registration_id)` | releases the slot |
| `match_room_credentials(match_id)` | returns room id/password only to approved participants after publish |
| `recalculate_leaderboard(tournament_id)` | recomputes `leaderboard_entries` from verified results |
| `player_stats(user_id)` | dashboard counters |
| `admin_stats()` | admin KPI payload (staff only) |
| `refresh_tournament_statuses()` | moves events past their deadlines |
| `bootstrap_super_admin(email)` | one-time role bootstrap |

## 4. Auth configuration

Supabase → Authentication:

* **Site URL** `https://rjnxgamingesports.com`
* **Redirect URLs**: `https://rjnxgamingesports.com/auth/callback`, `http://localhost:3000/auth/callback`, `rjnx://auth/callback`
* Email confirmations: on for production. The mobile app shows a
  “check your inbox” screen when a session is not returned immediately.
* Password reset uses the same allow-listed redirects.

## 5. RLS summary

| Table | Read | Write |
| --- | --- | --- |
| `profiles` | everyone | own row (staff: any) |
| `user_roles` | staff + own | super admin only |
| `tournaments`, `games`, `scoring_rules` | everyone (non-draft) | staff with the matching role |
| `teams`, `team_members` | everyone | captain / self |
| `team_invitations` | inviter, invitee, team captain, staff | inviter (create), invitee (respond) |
| `tournament_registrations` | own + staff | via RPC only (players), staff (status) |
| `matches`, `match_results` | participants + public once `verified` | staff |
| `notifications` | own | own (`is_read`), staff (create) |
| `audit_logs` | super admin | server-side inserts |
| `support_tickets` | own + staff | own (create), staff (reply) |
| `payment_transactions` | own + staff | server (service role) |
| `push_tokens` | own | own |

The service role key bypasses RLS and is only used inside server-only modules
(`notifyUser`, `notifyMany`, `sendPushToUsers`, payment verification, `admin_stats`
fallbacks) and never shipped to the browser or the app bundle.

## 6. Seed data

`supabase/seed.sql` inserts the game catalogue (BGMI, Free Fire MAX, Valorant,
Call of Duty Mobile), default scoring rules, platform settings, banners, a news
article and one demo tournament. Re-running it is safe: every insert uses
`on conflict do nothing` / `on conflict do update` on the natural key.
