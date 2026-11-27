# API reference

Everything the browser does is either a **Server Action** (mutations, CSRF-safe
via Next.js) or a **REST route** for machine clients and webhooks. Both run
server-side; the browser never holds a privileged key.

## Route handlers

### `GET /api/health`

Uptime/monitoring probe. No auth.

```json
{ "status": "ok", "service": "rjnx-web", "database": "ok", "detail": null, "serviceRole": "configured", "latencyMs": 42 }
```

`status` is `degraded` when the database probe fails; HTTP is always 200 so
monitors can distinguish “app up, DB down”.

### `POST /api/payments/create-order`

Creates a Razorpay order for a tournament entry. Session cookie required.

Body: `{ "tournament_id": "uuid", "team_id": "uuid|null" }`

* rejects with `503` when `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are not set on the server (the checkout button is then hidden too)
* amount is read from `rjnx.tournaments.entry_fee` (never from the client)
* requires an existing registration for that tournament
* writes a `rjnx.payment_transactions` row with status `created`

Returns `{ "order": { "id", "amount", "currency", "keyId" }, "transactionId": "uuid" }`.

### `POST /api/payments/verify`

Verifies the checkout result. Session required.

Body: `{ "razorpay_order_id": "…", "razorpay_payment_id": "…", "razorpay_signature": "…" }`

HMAC-SHA256 of `orderId|paymentId` with `RAZORPAY_KEY_SECRET`, compared in
constant time. On success the transaction becomes `paid` and the registration's
`payment_status` becomes `paid`; on failure `400` and nothing is unlocked.

### `POST /api/webhooks/razorpay`

Provider → server. No session; authenticated by `X-Razorpay-Signature` HMAC over
the **raw** body using `RAZORPAY_WEBHOOK_SECRET` (constant-time compare).

Handled events: `payment.captured`, `payment.failed`, `refund.processed`.
Idempotent — a repeated event is a no-op thanks to the transaction status check.
Notifies the player through `notifyUser`.

### `POST /api/notifications/read`

Marks all unread notifications of the session user as read. Returns `{ "ok": true }`.

### `GET /auth/callback` (route, not REST)

Exchanges the Supabase auth `code` for a session and redirects to `?next=`.

## Server actions (selected)

| Action | Guard | Effect |
| --- | --- | --- |
| `registerAction` | signed in, active, not suspended | calls `register_for_tournament` RPC (slot check, capacity, eligibility) |
| `cancelRegistrationAction` | owner | `cancel_registration` RPC |
| `createTeamAction` / `invitePlayerAction` / `respondInviteAction` | player | team CRUD with the one-team-per-player constraint |
| `updateProfileAction` | owner | profile fields (Zod validated) |
| `createTicketAction` | player | support ticket |
| `createTournamentAction` / `updateTournamentAction` | `can_manage_tournaments` | tournament CRUD + audit log |
| `generateBracketAction` | tournament manager | creates rounds/matches, seats participants |
| `publishRoomAction` | tournament manager | publishes room credentials, notifies approved players |
| `enterResultAction` / `verifyResultsAction` | manager / admin | results, recalculation, leaderboard refresh |
| `recalculateLeaderboardAction` | staff | recompute `leaderboard_entries` |
| `broadcastAction` | staff | notification fan-out (+ push) |
| `grantRoleAction` / `revokeRoleAction` / `suspendUserAction` | **super admin only** | role + suspension management, audited |
| `updateSettingsAction` | **super admin only** | platform settings, audited |

Every mutation returns `{ ok: true, data } | { ok: false, error }` and revalidates
the affected paths. Role guards double-check in the database (`is_super_admin()`,
`is_staff()`), so a forged request cannot escalate.

## Data access from the app

The Android app uses `@supabase/supabase-js` with the publishable key against
schema `rjnx` (see `apps/mobile/lib/api.ts`). RLS is the only authority: the
same policies protect web and mobile. Room credentials come from the
`match_room_credentials` RPC, which returns values only to approved participants
after `room_published_at`.

## Error conventions

| Status | Meaning |
| --- | --- |
| 400 | validation error / bad signature |
| 401 | no session |
| 403 | authenticated but lacks the role (database RPCs raise `FORBIDDEN`) |
| 404 | missing row, or hidden by RLS |
| 503 | feature disabled (payments off) / dependency unavailable |

## Rate limiting

Relies on the platform (Vercel edge) plus database-level checks. Payment
creation is idempotent per registration; webhook processing is idempotent per
provider event. If you need per-IP throttling, add a Vercel WAF rule on
`/api/payments/*` and `/api/webhooks/*`.
