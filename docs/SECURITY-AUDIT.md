# Supabase security audit

Date: 2026-10-13. Scope: every file in `supabase/migrations/` plus the live local database
(Postgres 17 + RLS, storage, grants), read in chronological order. Method: full migration read,
`pg_policies` / `pg_proc` / `pg_default_acl` inspection on the local database, and executable
proof-of-exploit runs as simulated `authenticated`/`anon` callers. Fixes live in
`supabase/migrations/20261013215426_security_hardening_1.sql`.

Verdicts: `ok` (nothing to fix), `fixed` (changed in the hardening migration), `risk-accepted`
(known and deliberately not changed, with rationale).

## Gaps found and fixed

1. **Friendship pair rewrite (critical).** `friendships_update_pair` allowed a pair member to
   change `requester_id` / `addressee_id` in the same UPDATE that satisfied the status check.
   Proof: user B inserted a pending row to X, then updated it to
   `requester_id = C, addressee_id = B, status = 'accepted'` and immediately read C's profile
   (and would read C's run logs). Fixed with a `before update` trigger that freezes the pair
   columns; only `status` / `responded_at` can change.
2. **Friend request spam.** The insert policy accepted unlimited rows per caller; the 20/day and
   100 pending limits existed only in `app/src/features/social/queries.ts`. Fixed with
   `can_send_friend_request()` evaluated in the INSERT `with check` (100 pending, 20 per rolling
   24h; the client window starts at local midnight, the server window is stricter at the edges).
3. **Handle search enumeration.** `find_profile_by_handle` could be called directly via REST
   without any server guard. Fixed with a per-caller quota table `rpc_rate_limits` and
   `consume_rpc_quota()`, called inside the function: 100 calls per rolling 24h per user.
4. **Pending request over-exposure.** `can_view_profile` granted the requester the addressee's
   full `profiles` row (including `lat` / `lon`) while the request was pending. Narrowed: pending
   rows expose the requester to the addressee only (that direction is what the requests inbox
   renders). Friends and self unchanged.
5. **`run_logs.shoe_id` cross-user reference.** Insert/update policies validated `workout_id`
   ownership but not `shoe_id`. Fixed in both policies.
6. **Blocks ignored by global leaderboards.** Blocked users still appeared in
   `weekly_leaderboard` and `adherence_weekly_leaderboard` (friends variants already filtered).
   Fixed with `not public.is_blocked_with(t.user_id)` in the ranked set.
7. **Legacy policies.** Ten policies used bare `auth.uid()` (per-statement re-evaluation instead
   of the `(select auth.uid())` initplan) and were scoped to `public` instead of `authenticated`.
   Recreated with the initplan form and the `to authenticated` role.
8. **Unused table privileges.** `anon` / `authenticated` held `TRUNCATE`, `REFERENCES`,
   `TRIGGER` on `public` tables via Supabase default privileges. Revoked for existing tables and
   future default privileges. TRUNCATE bypasses RLS, but is not reachable through PostgREST.

## Tables

| Table                | RLS | Operations and policies                                                                                  | Verdict | Rationale                                                                                                                        |
| -------------------- | --- | -------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`           | on  | select own + social, insert own, update own (both sides of ownership)                                    | fixed   | `premium` self-write risk-accepted below. `can_view_profile` narrowed; update `with check` blocks `id` changes. No email column. |
| `races`              | on  | select / insert / update / delete own                                                                    | fixed   | Ownership sound. Legacy policies recreated with `(select auth.uid())` and `to authenticated`.                                    |
| `plans`              | on  | select / insert / update / delete own; `race_id` must be owned                                           | fixed   | Cross-tenant `race_id` already blocked. Select/delete recreated for initplan and role.                                           |
| `workouts`           | on  | select / insert / update / delete own; `plan_id` must be owned                                           | fixed   | `swapped_with` cross-user reference risk-accepted below. Select/delete recreated.                                                |
| `run_logs`           | on  | select own or accepted friend (not blocked); insert / update / delete own; `workout_id`, `shoe_id` owned | fixed   | Friends predicate cannot be forged after the friendship pair fix. `shoe_id` ownership added.                                     |
| `push_subscriptions` | on  | select / insert / update / delete own                                                                    | ok      | Standard owner-only CRUD with `(select auth.uid())`.                                                                             |
| `push_config`        | on  | no policies (deny all)                                                                                   | ok      | VAPID private key and cron secret are unreachable through REST; only `get_push_public_key()` exposes the public key.             |
| `shoes`              | on  | select / insert / update / delete own                                                                    | ok      | Owner-only, no cross references accepted.                                                                                        |
| `friendships`        | on  | select / update / delete pair only, insert requester pending only                                        | fixed   | Pair columns frozen by trigger; quotas added; accept still addressee-only.                                                       |
| `blocks`             | on  | select / insert / delete blocker side only                                                               | ok      | Blocker cannot read who blocked them (asymmetric visibility by design).                                                          |
| `kudos`              | on  | select visible log, insert own on visible log, delete own                                                | ok      | Visible-log predicate shared with `run_logs`. Self-kudos allowed, see risk-accepted.                                             |
| `rpc_rate_limits`    | on  | no policies (deny all), table privileges revoked                                                         | fixed   | New internal table for `find_profile_by_handle` quota; only the definer helper touches it.                                       |
| `storage.objects`    | on  | `avatars` insert / select / update / delete owner-folder only                                            | ok      | Bucket is public-read by design (public avatar URLs); writes are restricted to `<uid>/...` and jpeg under 1 MiB.                 |

## RPCs and functions

| Function                            | Security          | search_path | Execute            | Ownership / access checks                                                             | Verdict     |
| ----------------------------------- | ----------------- | ----------- | ------------------ | ------------------------------------------------------------------------------------- | ----------- |
| `handle_new_user`                   | definer (trigger) | `''`        | no role            | Trigger on `auth.users` only.                                                         | ok          |
| `set_updated_at`                    | invoker (trigger) | `''`        | no role            | Trigger only.                                                                         | ok          |
| `swap_workouts`                     | invoker           | `''`        | authenticated      | Both ids owned, same plan.                                                            | ok          |
| `create_plan_with_workouts`         | invoker           | `''`        | authenticated      | Creates own race/plan/workouts via RLS; no caller-supplied ids.                       | ok          |
| `log_workout`                       | invoker           | `''`        | authenticated      | Workout owned and planned, shoe owned.                                                | ok          |
| `scale_week_volume`                 | invoker           | `''`        | authenticated      | Only own planned workouts; factor bounded 0.6-1.15.                                   | ok          |
| `recalibrate_plan`                  | invoker           | `''`        | authenticated      | Only own active plan and its workouts.                                                | ok          |
| `apply_week_plan`                   | invoker           | `''`        | authenticated      | Every workout id owned and planned; date clamped to plan range; only SKIPPED allowed. | ok          |
| `delete_my_account`                 | definer           | `''`        | authenticated      | Deletes only `auth.uid()`; storage cleanup is client-side (see limitations).          | ok          |
| `get_push_public_key`               | definer           | `''`        | authenticated      | Returns only the VAPID public key.                                                    | ok          |
| `weekly_leaderboard`                | definer, stable   | `''`        | authenticated      | Aggregates only, public profiles only, blocked users now hidden.                      | fixed       |
| `adherence_weekly_leaderboard`      | definer, stable   | `''`        | authenticated      | Same, with `having count(*) >= 2` floor; blocked users now hidden.                    | fixed       |
| `friends_weekly_leaderboard`        | definer, stable   | `''`        | authenticated      | Restricts to accepted friends, self, excludes blocks.                                 | ok          |
| `friends_adherence_leaderboard`     | definer, stable   | `''`        | authenticated      | Same friend predicate.                                                                | ok          |
| `is_blocked_with`                   | definer, stable   | `''`        | authenticated      | Boolean about the caller only; no enumeration value.                                  | ok          |
| `is_friend_or_self`                 | definer, stable   | `''`        | authenticated      | Boolean about the caller only.                                                        | ok          |
| `can_view_run_log`                  | definer, stable   | `''`        | authenticated      | Boolean; used by `kudos` and mirrored in `run_logs` select.                           | ok          |
| `can_view_profile`                  | definer, stable   | `''`        | authenticated      | Boolean; pending direction narrowed to addressee reading requester.                   | fixed       |
| `find_profile_by_handle`            | definer, volatile | `''`        | authenticated      | Exact handle / display-name match, limit 1, now quota-limited to 100 per 24h.         | fixed       |
| `can_send_friend_request`           | definer, stable   | `''`        | authenticated      | Counts the caller's own pending and 24h requests only.                                | fixed (new) |
| `consume_rpc_quota`                 | definer           | `''`        | no role (internal) | Atomic per-caller counter; quota actually enforced inside `find_profile_by_handle`.   | fixed (new) |
| `enforce_friendship_pair_immutable` | invoker (trigger) | `''`        | no role            | Trigger only; freezes `requester_id` / `addressee_id` on update.                      | fixed (new) |

All RPCs are revoked from `public` and `anon`; only `authenticated` holds execute where the
surface is user-facing. `service_role` is untouched. No `security definer` function lacks
`set search_path = ''`.

## Risk accepted / deferred

- **`profiles.premium` is self-writable.** The E2E suite explicitly grants premium to itself via
  the anon-key client (`app/e2e/premium.spec.ts`). This is the documented phase decision in
  `docs/features/28-premium/plan.md`: the gate is client-side until payments exist, then server
  enforcement arrives with `premium_until` and receipt validation. Locking the column now would
  break the premium flow and its tests.
- **Self-kudos are allowed** (`kudos_insert_own` accepts a visible log, and own logs are
  visible). Inflating your own count by one has no product surface (kudos are not ranked).
- **`workouts.swapped_with` may reference another user's workout** by UUID. The value is never
  returned to the caller and `swap_workouts` validates ownership; a self-reference check inside
  the policy would recurse RLS, which the earlier data-layer audit already flagged and skipped.
- **Blocks do not hide users from `find_profile_by_handle`.** A blocked user can still resolve an
  exact handle or exact display name and receive `id`, `display_name`, `avatar_url`; the client
  then calls `is_blocked_with` and shows the "blocked" error. Making the RPC return nothing would
  change the message to "not found", which is a product decision, not a row-level leak.
- **The public profile flag does not make the `profiles` row directly readable.** Public users
  appear only through the definer leaderboard RPCs, which return a fixed narrow projection
  (id, display_name, avatar_url, aggregates). This is intentionally tighter than "public flag
  grants row access".
- **`push_subscriptions.endpoint` is globally unique.** A caller cannot register another user's
  endpoint without knowing that browser endpoint secret; a duplicate endpoint surfaces as a
  unique violation, not a takeover.
- **`TRUNCATE` cannot be reached through PostgREST** (no SQL passthrough), so the old grant was a
  latent DB-privilege issue rather than a remote exploit; it is revoked anyway.
- **`push_config` has RLS enabled with zero policies.** That is a deliberate "deny all" state,
  not an accident: the edge function uses the service role.

## Verification

- `npx supabase db reset` clean; all 21 migrations applied including the hardening one.
- Friendship forge repro: before the fix a pending row could be rewritten to an accepted pair and
  the victim's profile became readable; after the fix the update fails with
  `ERROR: friendship pair is immutable`.
- Foreign `shoe_id` on `run_logs` insert now fails with an RLS violation; owned shoes still work.
- 100 handle searches in a rolling 24h succeed, the 101st raises `rate limit exceeded`.
- After 20 requests in a rolling 24h, `can_send_friend_request()` returns false and a direct REST
  insert is rejected by the policy.
- `anon`: 0 rows from `profiles` / `push_config`, permission denied on every RPC.
- `npm run typecheck`, `npm run test` (338 tests), `npm run lint -w app` (0 errors) all pass.
- `npx playwright test`: 89 passed using `TZ=UTC` (the CI timezone). Outside UTC, `ics` and
  `reschedule-manual` flake between local midnight and 02:00 CET because the e2e helpers build
  dates from `toISOString()` while the browser uses the local zone; this predates the hardening
  migration.

## Client-side limitations

- **Friend request quotas** are now enforced twice: the server check is authoritative; the client
  pre-check stays for nicer error messages. The server uses a rolling 24h window, the client uses
  local midnight.
- **Account deletion and storage:** `delete_my_account()` cascades all public rows, and the
  client removes `avatars/<uid>/...` through the Storage API before calling the RPC. A caller
  invoking the RPC directly would delete the account but leave the avatar object in storage.
  Direct SQL deletion from `storage.objects` is blocked by the storage `protect_delete` trigger,
  so a server-side cleanup would need an edge function or lifecycle rule.
- **Premium gating** stays client-side until payments (`docs/features/28-premium/plan.md`).
- **Handle search quota** returns a generic `rate limit exceeded` error to the client, which the
  social UI maps to its generic failure message.
- **Leaderboards** still render `display_name` as null for users without a name; the UI falls
  back to its anonymous label. No email or coordinates are ever returned by any RPC.
