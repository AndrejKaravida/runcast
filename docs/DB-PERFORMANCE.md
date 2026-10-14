# Database performance audit (wave 7)

Scope: index and query-plan audit for the client-facing Postgres surface. Migrations only, no app code.
Audited 21 migrations and all client query modules (`app/src/features/**/queries.ts`, `supabase/functions/send-reminders/index.ts`).

## Test data

`scripts/db-perf-seed.sql` (local only, never run against prod) seeds 200 users, 5 plans each, 100 workouts per plan (100,000 workouts), 20,000 run logs, 2,000 friendships, 5,000 kudos, 1,000 races, 400 shoes, 200 push subscriptions. The script finishes in about 2 seconds on the local stack. Run with:

```bash
docker exec -i supabase_db_runcast psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scripts/db-perf-seed.sql
```

## Inventory: tables and existing indexes

| Table                | Row count in seed | Indexes before this wave                                                                        |
| -------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `profiles`           | 200               | pkey (id), unique lower(username) partial                                                       |
| `races`              | 1,000             | pkey (id), (user_id)                                                                            |
| `plans`              | 1,000             | pkey (id), (user_id, status, created_at desc), unique (user_id) where active, (race_id)         |
| `workouts`           | 100,000           | pkey (id), (user_id, workout_date), (plan_id)                                                   |
| `run_logs`           | 20,000            | pkey (id), (user_id, log_date), (log_date), (workout_id), unique (user_id, external_id) partial |
| `friendships`        | 2,000             | pkey (id), unique pair (least, greatest), (requester_id), (addressee_id)                        |
| `blocks`             | 0                 | pkey (blocker_id, blocked_id), (blocked_id)                                                     |
| `kudos`              | 5,000             | pkey (run_log_id, user_id), (user_id)                                                           |
| `shoes`              | 400               | pkey (id), (user_id)                                                                            |
| `push_subscriptions` | 200               | pkey (id), unique (endpoint), (user_id)                                                         |
| `push_config`        | 0                 | pkey (id)                                                                                       |
| `rpc_rate_limits`    | 0                 | pkey (user_id, rpc)                                                                             |

No exact duplicate indexes exist. The unique pair index on `friendships` is an expression index and cannot serve the client `.or(requester, addressee)` lookups, so the per column indexes were doing that work.

## Query patterns actually used

| #   | Pattern                                                                                                  | Source                                                                |
| --- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Q1  | `run_logs` by `user_id`, order `log_date desc`, limit 300                                                | `logs/queries.ts` useRunLogs                                          |
| Q2  | `run_logs` by friend `user_id` list, order `log_date desc, created_at desc`, limit 20                    | `social/queries.ts` useFriendsFeed                                    |
| Q3  | `run_logs` by friend list plus current week range, group by user                                         | `social/queries.ts` useFriends                                        |
| Q4  | `run_logs` global week range, grouped by user                                                            | `weekly_leaderboard`, `friends_weekly_leaderboard` RPCs               |
| Q5  | `friendships` by `addressee_id` + `status = pending`, order `created_at`                                 | `social/queries.ts` useFriendRequests                                 |
| Q6  | `friendships` count by `requester_id` + `status = pending`                                               | `social/queries.ts` useSendFriendRequest, `can_send_friend_request()` |
| Q7  | `races` by `user_id`, order `race_date`                                                                  | `plans/queries.ts` useRaces                                           |
| Q8  | `workouts` by `user_id` + `plan_id` + exact `workout_date`                                               | `plans/queries.ts` useMoveWorkout                                     |
| Q9  | `workouts` joined to active `plans`, week range, type filter                                             | `adherence_weekly_leaderboard` RPCs                                   |
| Q10 | `shoes` by `user_id`, order `created_at`                                                                 | `gear/queries.ts` useShoes                                            |
| Q11 | `workouts` by `user_id` plus date range, order `workout_date`                                            | `plans/queries.ts` useWorkoutsRange                                   |
| Q12 | `workouts` by `user_id` + `plan_id`                                                                      | `health/queries.ts` health import                                     |
| Q13 | `push_subscriptions` by `user_id`, order `created_at`, limit 1                                           | `push/queries.ts` usePushSubscription                                 |
| Q14 | `kudos` by `run_log_id` in list, and by (`run_log_id`, `user_id`) for like/undo                          | `social/queries.ts` useFriendsFeed, useKudos                          |
| Q15 | `plans` by `user_id` + `status = active`, order `created_at desc`, limit 1                               | `plans/queries.ts` useActivePlan                                      |
| Q16 | cron sweeps: `push_subscriptions` by user, `workouts` by user list plus date range, `races` by date list | `supabase/functions/send-reminders/index.ts`                          |

## Indexes added (migration `20261014010750_db_indexes.sql`)

| Index                                            | Rationale                                                                                                                                  | Replaces                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| `workouts (plan_id, workout_date)`               | Equality on `plan_id` then range/sort on `workout_date`: move workout lookup (Q8), recalibrate scan, plan date ranges                      | `workouts_plan_id_idx`      |
| `friendships (addressee_id, status, created_at)` | Friend request list (Q5): equality, equality, ordered output; also serves the reversed pair branch of the feed and leaderboard RLS lookups | `friendships_addressee_idx` |
| `friendships (requester_id, status, created_at)` | Pending request count and daily quota count (Q6); reversed pair branch of pair lookups                                                     | `friendships_requester_idx` |
| `races (user_id, race_date)`                     | Exact equality plus `ORDER BY` for the races list (Q7)                                                                                     | `races_user_id_idx`         |
| `shoes (user_id, created_at)`                    | Exact equality plus `ORDER BY` for the gear list (Q10)                                                                                     | `shoes_user_id_idx`         |

Net index count is +1. Every replaced index is a strict prefix of its replacement, so no lookup lost its path.

## EXPLAIN (ANALYZE, BUFFERS) before and after

Local single-run measurements, 100k workouts and 20k run logs. Before column is one pass on the seeded database, after column is the warm second pass following index creation, both on Postgres 17.11 in the Supabase container. Sub-millisecond differences are noise; the plan shape is the durable evidence.

| Query                      | Plan before                                                                 | Plan after                                                                                                                  | Time before | Time after |
| -------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------- |
| Q1 logs list               | Index Scan Backward on (user_id, log_date)                                  | unchanged                                                                                                                   | 0.081 ms    | 0.075 ms   |
| Q2 friends feed            | Nested Loop Semi Join on log_date index, 5,506 rows rejected by join filter | same shape, friendship filter now inside the index                                                                          | 0.786 ms    | 0.674 ms   |
| Q3 friends weekly km       | nested loop, index scan per friend                                          | unchanged                                                                                                                   | 0.102 ms    | 0.107 ms   |
| Q4 weekly stats            | Bitmap Index Scan on (log_date)                                             | unchanged                                                                                                                   | 0.145 ms    | 0.113 ms   |
| Q4b weekly_leaderboard RPC | function scan                                                               | unchanged                                                                                                                   | 2.556 ms    | 1.894 ms   |
| Q5 friend requests         | Index Scan (addressee_id) + filter + sort                                   | Index Scan (addressee_id, status, created_at), no filter, no sort                                                           | 0.015 ms    | 0.007 ms   |
| Q6 pending count           | Index Scan (requester_id) + filter                                          | Index Only Scan, 0 heap fetches                                                                                             | 0.016 ms    | 0.015 ms   |
| Q7 races list              | Bitmap (user_id) + sort of 5 rows                                           | Bitmap on composite + sort (sort kept at this row count)                                                                    | 0.034 ms    | 0.024 ms   |
| Q8 move workout            | BitmapAnd of (user_id, workout_date) and (plan_id)                          | single Index Scan (plan_id, workout_date), filter on user_id                                                                | 0.063 ms    | 0.023 ms   |
| Q9 adherence week          | Hash Join, bitmap week sweep of 5,555 index rows                            | Hash Join, same shape, composite is used by the plan-driven recalibrate and move paths; planner keeps the hash plan locally | 2.991 ms    | 1.975 ms   |
| Q10 shoes list             | Bitmap (user_id) + sort of 2 rows                                           | Bitmap on composite + sort                                                                                                  | 0.030 ms    | 0.022 ms   |
| Q11 workouts range         | Bitmap (user_id, workout_date) + sort                                       | unchanged                                                                                                                   | 0.074 ms    | 0.056 ms   |
| Q12 health import          | BitmapAnd of (plan_id) and (user_id, workout_date)                          | BitmapAnd of composite and (user_id, workout_date)                                                                          | 0.160 ms    | 0.127 ms   |

No hot query used a Seq Scan before this wave, so there is no Seq Scan to Index Scan transition to report. Every client path already had a usable single column index. The measurable gains are plan shape changes (BitmapAnd to single index scan, sort and filter elimination, an index-only scan) and lower row counts touched per execution.

Honest read on Q9: at 200 active plans and 100k workouts the planner treats the plan-driven nested loop and the date-driven hash join as a near tie and sometimes picks the nested loop with the new composite, sometimes the hash join. The seed week is 7 of 100 plan days, so the date sweep is not yet expensive. As plan count grows the nested loop stays linear in plans while the weekly sweep grows with total workouts, which is why the composite is kept.

## Intentionally not changed

- Client `select *` patterns (run logs list, workouts range, races, shoes, push): plain indexes already cover the predicates, and adding covering indexes would duplicate wide payloads for little gain at current volumes.
- `run_logs` friend feed ordering (Q2): the query orders by `log_date` across many authors. No single index can serve an IN list plus global order, and the existing `(log_date)` index gives a bounded backward scan. Changing the shape of the query is an app decision, out of scope here.
- `run_logs (shoe_id)` for the delete cascade: no client read filters by shoe, gear totals are computed client-side, so the index would only serve `ON DELETE SET NULL` maintenance. Revisit if logs per shoe grow.
- `push_subscriptions (user_id, created_at)`: at most a handful of rows per user, the sort is trivial.
- `push_subscriptions` cron sweep (Q16) intentionally scans the whole table, that is the job.
- RPC internals were left untouched: `weekly_leaderboard` profile scans are cheap relative to the week aggregation, `find_profile_by_handle` scans `profiles` (200 rows) because the OR mixes `lower(username)` and `lower(display_name)` and no display name index exists.
- `kudos` lookups ride the `(run_log_id, user_id)` primary key, nothing to add.

## Production rollout note

The migration uses plain `CREATE INDEX` / `DROP INDEX`, which briefly locks writes and is fine at current sizes. On hot production tables (`workouts`, `run_logs`) use `CREATE INDEX CONCURRENTLY` and `DROP INDEX CONCURRENTLY` in a follow-up when the tables are large.

## Verification

- `npx supabase db reset`: applies cleanly from scratch, seed script reruns afterwards.
- `npm run db:types`: no type changes.
- Gate: prettier check, typecheck, unit tests, lint and the Playwright suite all green locally; CI green after push.
