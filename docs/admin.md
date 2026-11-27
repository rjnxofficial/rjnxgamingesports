# Admin Command Center

Route: `/admin` — staff only, enforced twice (middleware/session guard in the
Next.js layer and `rjnx.is_staff()` inside every RPC/policy).

## Roles

| Role | Weight | Can do |
| --- | --- | --- |
| `player` | 0 | own profile, registrations, teams, support tickets |
| `moderator` | 1 | support inbox, results review, notification broadcasts, read-only lists |
| `tournament_manager` | 2 | create/edit tournaments, brackets, matches, room credentials, review registrations, enter + verify results |
| `admin` | 3 | everything a tournament manager can, plus tickets, news, banners, reports, leaderboard/scoring rules, games |
| `super_admin` | 4 | all of the above **plus** grant/revoke roles, edit platform settings, suspend/reinstate users, read the audit log |

The four exclusive super-admin capabilities are exactly: **roles**, **platform
settings**, **suspensions**, **audit log**. Everything else is available to the
lower staff tiers according to the table above.

## Hard rules

* **No self-promotion.** `grantRoleAction` rejects `user_id === session.user.id`
  and the `user_roles` insert policy requires `rjnx.is_super_admin()`. Nobody can
  grant themselves anything, and an admin cannot mint another super admin.
* **No lockout**: nobody can suspend their own account, the last super admin
  cannot be suspended, and the last super admin role cannot be revoked.
* Every privileged mutation writes `rjnx.audit_logs` (actor, action, entity,
  metadata) — the audit page is read-only.
* Tournaments in `live`/`completed` state cannot be deleted; results must be
  corrected instead, preserving history.

## Pages

| Page | Purpose |
| --- | --- |
| `/admin` | KPI dashboard (`admin_stats` RPC): users, live events, pending approvals, revenue |
| `/admin/tournaments` (+ `/new`, `/[id]`) | CRUD, bracket generation, room publishing, participant management |
| `/admin/registrations` | approve / reject / waitlist, payment state |
| `/admin/matches` | schedule, maps, room credentials, status transitions |
| `/admin/results` | enter placements/kills, verify, recalculate leaderboard |
| `/admin/leaderboard` | standings, scoring rule editor |
| `/admin/users` | directory; super admin: suspend/reinstate + quick role grants |
| `/admin/roles` | the permission matrix + role revoke (super admin) |
| `/admin/news`, `/admin/banners` | content |
| `/admin/notifications` | broadcast (in-app + push) |
| `/admin/reports` | revenue/participation reports |
| `/admin/settings` | platform settings (super admin) |
| `/admin/audit` | audit trail (super admin) |
| `/admin/support` | ticket inbox with reply |

## Operational workflows

**Publish a tournament** → create with status `draft` → fill rules/prizes/times →
Review → set `published` → flip to `registration_open`. Registration closes
automatically when the deadline passes (`refresh_tournament_statuses`).

**Run an event** → generate bracket after registrations close → schedule matches →
publish room credentials (notifies approved players) → enter results → **verify**
results (only verified results count) → recalculate leaderboard.

**Handle a dispute** → `/admin/support` reply, or `/admin/results` correct the
placement/kills and re-verify; the leaderboard recomputes from verified rows only.

**Suspend a player** → `/admin/users` (super admin) → suspend with a reason. Their session is
redirected to `/suspended`; writes are blocked by `rjnx.is_active_user()`.

## Payments (optional)

`/admin/reports` shows paid transactions when the module is enabled. Prize
pay-outs are **not** automated: payouts are manual and offline until a
legal/compliance review signs off.
