# 02 — Data layer, RLS/auth & Supabase audit (RunCast)

Applying rules: SEARCH, REUSE, NO_ASSUMPTIONS, CHALLENGE. Audit was read-only; nothing in `app/`, `packages/` or `supabase/` was modified.

## Summary

**Good:** all 5 tables have RLS enabled with own-row policies on every operation they require; query keys are user-scoped; PKCE + `detectSessionInUrl` is the right SPA setup (supabase-js 2.117.3); generated types are committed; FK cascades to `auth.users` are complete for GDPR-style deletion; sensible CHECK constraints.

**Risky:** every plan-write flow is a sequence of REST calls with no transaction — swap (P0) and generate/onboarding (P0) corrupt state on partial failure. RLS `with check` does not validate FK parents (P1 cross-tenant reference injection). Nothing enforces one ACTIVE plan per user (P1). Query cache is not cleared on sign-out (P1; user-scoped keys mean the assumed P0 cross-user render leak is **not reproducible** — F5). Missing `plans` index (P2), weather errors invisible (P2), prod auth settings only exist for local (P2).

## Findings

| file                                                              | issue                                                                                                                                                                                                                                                                                                                                                                                         | sev    | concrete fix                                                                                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `app/src/features/plans/queries.ts:176`                           | `useSwapWorkouts` sends two UPDATEs; failure between them leaves one workout with the other's date (corrupted week)                                                                                                                                                                                                                                                                           | **P0** | `swap_workouts` RPC in 0002 (single transaction), call via `.rpc()`                                                              |
| `app/src/features/plans/queries.ts:79` + `OnboardingPage.tsx:192` | archive → race → plan → workouts(400-row chunks) multi-step; failure after archive leaves user with **no** ACTIVE plan; retry duplicates race/plan and re-archives                                                                                                                                                                                                                            | **P0** | `create_plan_with_workouts` RPC (one tx); keep client draft generation                                                           |
| `supabase/migrations/0001_init.sql`                               | `workouts.plan_id`, `run_logs.workout_id`, `plans.race_id` can reference **another user's** rows (UUID must be known/leaked); `workouts_update_own` lets `plan_id` change to a foreign plan                                                                                                                                                                                                   | **P1** | add `exists (parent owned by auth.uid())` to insert/update checks (0002). Skip `swapped_with` (self-reference would recurse RLS) |
| `0001_init.sql`                                                   | no constraint that a user has ≤1 ACTIVE plan; concurrent generate (two tabs) creates two                                                                                                                                                                                                                                                                                                      | **P1** | partial unique index `on plans (user_id) where status='ACTIVE'` (0002)                                                           |
| `app/src/auth/AuthProvider.tsx:24`                                | `queryClient.clear()` never runs on sign-out; cached PII stays in memory. **Challenge:** all keys are scoped — `['profile',userId]`, `['plan','active',userId]`, `['workouts',userId,…]`, `['workout',userId,id]`, `['run-logs',userId]`; only `['weather',lat,lon]` is unscoped (public data) — so no cross-user render leak is reproducible. Still defense-in-depth + shared-device hygiene | **P1** | in `onAuthStateChange`: `if (event === 'SIGNED_OUT') queryClient.clear();` (also clear when `user.id` changes)                   |
| `app/src/features/logs/queries.ts:19`                             | log insert + `status='DONE'` update non-atomic; retry after partial failure duplicates `run_logs` (no unique key)                                                                                                                                                                                                                                                                             | P2     | `log_workout` RPC or partial unique index on `run_logs(workout_id)` + upsert                                                     |
| `app/src/features/plans/queries.ts:19`, `0001_init.sql:78-80`     | `plans` has **no index at all** on `user_id`; `useActivePlan` filters user+status, orders `created_at desc`                                                                                                                                                                                                                                                                                   | P2     | `plans (user_id, status, created_at desc)` (0002)                                                                                |
| `0001_init.sql`                                                   | unindexed FKs: `plans.race_id`, `workouts.plan_id`, `run_logs.workout_id`, `workouts.swapped_with` (cascade/scan cost, Supabase linter)                                                                                                                                                                                                                                                       | P2     | add `(plan_id)`, `(workout_id)`, `(race_id)` indexes (0002)                                                                      |
| `app/src/types/database.ts:277`                                   | `Functions: never`; after RPCs exist, `.rpc()` is `any`/untyped until regeneration                                                                                                                                                                                                                                                                                                            | P1     | regenerate after 0002; document command + optional `"db:types"` script                                                           |
| `app/src/types/index.ts:8`                                        | hand-written `TablesInsertRow` duplicates generated `TablesInsert<'workouts'>`                                                                                                                                                                                                                                                                                                                | P2     | optional: use `TablesInsert`/`Tables` from generated file, delete helper                                                         |
| `app/src/features/weather/queries.ts` + `WeatherSummaryCard.tsx`  | `weather.isError` never surfaced — fetch failure shows "Nema podataka", same as empty; profile-loading also shows "no data"                                                                                                                                                                                                                                                                   | P2     | pass `isError` and render "Prognoza nedostupna" + retry (`refetch`)                                                              |
| `app/src/pages/ResetPasswordPage.tsx:24`                          | relies on session presence, never on `PASSWORD_RECOVERY`; brief "Link nije važeći" flash possible before `INITIAL_SESSION`; link opened on another device/browser fails (PKCE verifier is local, by design)                                                                                                                                                                                   | P2     | track `PASSWORD_RECOVERY` in AuthProvider; keep loading until it or INITIAL_SESSION; extend invalid copy for cross-device case   |
| `app/src/lib/auth-errors.ts`                                      | missing mappings: `For security purposes` (429), `New password should be different`, weak-password rule messages, `Signups not allowed`, expired/invalid link, `Auth session missing`                                                                                                                                                                                                         | P2     | extend `authErrorMessage`                                                                                                        |
| `supabase/config.toml`                                            | local-only auth: `enable_confirmations=false`, `minimum_password_length=6`, redirect allowlist is localhost, `secure_password_change=false`                                                                                                                                                                                                                                                   | P2     | prod dashboard: confirmations ON, min length 8, Site URL + redirect URLs = prod origin, secure change ON                         |
| `0001_init.sql:122-126`                                           | `profiles` has no INSERT policy — **acceptable** (security-definer trigger). But `useUpdateProfile().single()` on a missing profile returns PGRST116 → onboarding stuck if trigger ever fails                                                                                                                                                                                                 | P2     | add `profiles_insert_own` (0002) or make onboarding an upsert                                                                    |
| `0001_init.sql:82-109`                                            | `handle_new_user` is hardened (`security definer`, `set search_path=public`, qualified inserts) — good, tighten to `''`; `set_updated_at` has no `search_path` (linter `function_search_path_mutable`)                                                                                                                                                                                        | P2     | `alter function … set search_path = ''` for both (0002)                                                                          |
| `app/`                                                            | no account-deletion flow; DB side is ready (all tables `on delete cascade` from `auth.users`); the browser cannot delete a user with the anon key                                                                                                                                                                                                                                             | P2     | Edge Function using service role: `auth.admin.deleteUser(auth.uid())` + Settings button; document                                |

## Ordered implementation checklist

**1. Add `supabase/migrations/0002_data_integrity.sql`** — acceptance: applies cleanly on a fresh `db reset`; pre-check `select user_id from plans where status='ACTIVE' group by 1 having count(*)>1` must be empty before adding the unique index (otherwise archive duplicates first).

```sql
alter function public.handle_new_user() set search_path = '';
alter function public.set_updated_at() set search_path = '';

create index plans_user_status_created_idx on public.plans (user_id, status, created_at desc);
create unique index plans_one_active_per_user on public.plans (user_id) where status = 'ACTIVE';
create index plans_race_id_idx on public.plans (race_id);
create index workouts_plan_id_idx on public.workouts (plan_id);
create index run_logs_workout_id_idx on public.run_logs (workout_id);

drop policy workouts_insert_own on public.workouts;
create policy workouts_insert_own on public.workouts for insert
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.plans p where p.id = plan_id and p.user_id = (select auth.uid()))
);
drop policy workouts_update_own on public.workouts;
create policy workouts_update_own on public.workouts for update
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.plans p where p.id = plan_id and p.user_id = (select auth.uid()))
);
drop policy run_logs_insert_own on public.run_logs;
create policy run_logs_insert_own on public.run_logs for insert
with check (
  user_id = (select auth.uid())
  and (workout_id is null
       or exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid())))
);
drop policy run_logs_update_own on public.run_logs;
create policy run_logs_update_own on public.run_logs for update
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (workout_id is null
       or exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid())))
);
drop policy plans_insert_own on public.plans;
create policy plans_insert_own on public.plans for insert
with check (
  user_id = (select auth.uid())
  and (race_id is null
       or exists (select 1 from public.races r where r.id = race_id and r.user_id = (select auth.uid())))
);
drop policy plans_update_own on public.plans;
create policy plans_update_own on public.plans for update
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (race_id is null
       or exists (select 1 from public.races r where r.id = race_id and r.user_id = (select auth.uid())))
);
create policy profiles_insert_own on public.profiles for insert with check (id = (select auth.uid()));

create function public.swap_workouts(p_first uuid, p_second uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_first_date date; v_second_date date;
  v_first_plan uuid; v_second_plan uuid;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_first = p_second then return; end if;
  select workout_date, plan_id into v_first_date, v_first_plan
    from public.workouts where id = p_first and user_id = v_user_id;
  select workout_date, plan_id into v_second_date, v_second_plan
    from public.workouts where id = p_second and user_id = v_user_id;
  if v_first_date is null or v_second_date is null then raise exception 'workout not found'; end if;
  if v_first_plan <> v_second_plan then raise exception 'workouts belong to different plans'; end if;
  update public.workouts
     set workout_date = case when id = p_first then v_second_date else v_first_date end,
         swapped_with  = case when id = p_first then p_second else p_first end
   where user_id = v_user_id and id in (p_first, p_second);
end;
$$;

create function public.create_plan_with_workouts(
  p_race jsonb, p_start_date date, p_race_date date, p_weeks integer, p_days_per_week integer,
  p_long_run_day integer, p_experience text, p_volume_band text, p_anchor jsonb, p_paces jsonb, p_workouts jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_race_id uuid; v_plan_id uuid;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  update public.plans set status = 'ARCHIVED' where user_id = v_user_id and status = 'ACTIVE';

  if p_race is not null then
    insert into public.races (user_id, name, race_date, distance_km, goal_time_sec)
    values (v_user_id, p_race ->> 'name', (p_race ->> 'raceDate')::date,
            coalesce((p_race ->> 'distanceKm')::numeric, 42.195), (p_race ->> 'goalTimeSec')::integer)
    returning id into v_race_id;
  end if;

  insert into public.plans (user_id, race_id, status, start_date, race_date, weeks, days_per_week,
                            long_run_day, experience, volume_band, anchor, paces)
  values (v_user_id, v_race_id, 'ACTIVE', p_start_date, p_race_date, p_weeks, p_days_per_week,
          p_long_run_day, p_experience, p_volume_band, p_anchor, p_paces)
  returning id into v_plan_id;

  insert into public.workouts (user_id, plan_id, workout_date, type, title, distance_km,
                               duration_sec, pace_zone, steps, phase, status)
  select v_user_id, v_plan_id, (item ->> 'date')::date, item ->> 'type', item ->> 'title',
         coalesce((item ->> 'distanceKm')::numeric, 0), (item ->> 'durationSec')::integer,
         item ->> 'paceZone', coalesce(item -> 'steps', '[]'::jsonb), item ->> 'phase', 'PLANNED'
    from jsonb_array_elements(p_workouts) as item;

  return v_plan_id;
end;
$$;

revoke execute on function public.swap_workouts from public, anon;
grant execute on function public.swap_workouts to authenticated;
revoke execute on function public.create_plan_with_workouts from public, anon;
grant execute on function public.create_plan_with_workouts to authenticated;
```

**2. Regenerate types** — `npx supabase gen types typescript --local > app/src/types/database.ts` (CLI is a root devDependency; PLAN.md documents this). Acceptance: local db running, `Functions` contains both RPCs, `npm run typecheck` + `npm run lint` pass.

**3. Wire RPCs** — `useSwapWorkouts`: `supabase.rpc('swap_workouts', { p_first: first.id, p_second: second.id })`; `useGeneratePlan`: one `supabase.rpc('create_plan_with_workouts', { p_race: input.race, …, p_workouts: draft.workouts })` after client-side `generatePlan`; old archive/insert code removed. Acceptance: killing the tab/network mid-call leaves the previous plan and dates intact (verify via SQL); double-click creates one plan.

**4. Cache hygiene** — clear cache on sign-out in `AuthProvider` using the `queryClient` singleton; also clear if `session.user.id` differs from the previous id. Acceptance: after sign-out, `queryClient.getQueryCache().getAll()` is empty; user B never sees a request served from user A's cache.

**5. Weather error UI** — pass `weather.isError` + `refetch` into `WeatherSummaryCard`; render an explicit error message with a retry button; keep manual (`weather_refresh_minutes = null`) behavior as-is. Acceptance: blocked network shows the error state, not "Nema podataka".

**6. Auth polish** — track `PASSWORD_RECOVERY` (and delay the invalid-link verdict until `INITIAL_SESSION`/event) in `AuthProvider`; extend `authErrorMessage` with F13 messages. Acceptance: reset link lands on the form without an invalid-link flash; rate-limit and expired-link errors get Serbian copy.

**7. Prod auth config (dashboard)** — confirmations ON, Site URL + redirect allowlist = prod origin, min password 8, `secure_password_change` ON; note PKCE email links require the same browser (cross-device link → request new link). Acceptance: register → email confirm → login works on the deployed origin; reset link from same browser works.

**8. Account deletion (optional, after 1–4)** — Edge Function with service role calling `auth.admin.deleteUser(auth.uid())`; Settings button. Acceptance: deleting removes the auth user and all five tables' rows via cascade.

## Out of scope

Google/OAuth login, push notifications, MFA, full data export, pgTAP/RLS test suite, realtime, rate-limit tuning, CI/deploy changes, prefetch/code-splitting, and any `@runcast/shared` plan-generator changes.
