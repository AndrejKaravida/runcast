-- Local performance seed for EXPLAIN checks. Local only, never run against prod.
-- Usage: docker exec -i supabase_db_runcast psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scripts/db-perf-seed.sql

truncate table
  public.kudos,
  public.blocks,
  public.friendships,
  public.rpc_rate_limits,
  public.push_subscriptions,
  public.shoes,
  public.run_logs,
  public.workouts,
  public.plans,
  public.races,
  public.profiles
restart identity cascade;

delete from auth.users;

create temp table perf_users as
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid as id, n
from generate_series(1, 200) as n;

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
       'perf' || n || '@example.com', now(), now() - (n || ' hours')::interval, now()
from perf_users;

update public.profiles p
   set display_name = 'Perf User ' || u.n,
       username = 'perf' || u.n,
       public_profile = (u.n % 4 <> 1),
       lat = 44.8,
       lon = 20.4,
       city = 'Belgrade',
       onboarding_completed = true
from perf_users u
where p.id = u.id;

insert into public.races (user_id, name, race_date, distance_km, goal_time_sec)
select u.id, 'Race ' || k, current_date - 100 + k * 40, 42.195, 12600 + k * 300
from perf_users u
cross join generate_series(1, 5) as k;

with race_rows as (
  select id, user_id, row_number() over (partition by user_id order by race_date) as rn
  from public.races
), plan_seed as (
  select u.id as user_id, u.n, r.id as race_id, r.rn, current_date - (u.n % 140) as start_date
  from perf_users u
  join race_rows r on r.user_id = u.id
)
insert into public.plans (user_id, race_id, status, start_date, race_date, weeks, days_per_week, long_run_day, experience, volume_band, anchor, paces)
select user_id, race_id,
       case when rn = 5 then 'ACTIVE' else 'ARCHIVED' end,
       start_date,
       start_date + 139,
       20,
       4,
       0,
       case when n % 2 = 0 then 'experienced' else 'first' end,
       case when n % 3 = 0 then '40-60' when n % 3 = 1 then '20-40' else 'gt60' end,
       '{}'::jsonb,
       '{}'::jsonb
from plan_seed;

insert into public.workouts (user_id, plan_id, workout_date, type, title, distance_km, duration_sec, pace_zone, phase, status)
select p.user_id, p.id, p.start_date + d,
       case
         when d % 7 = 0 then 'LONG'
         when d % 7 = 2 then 'TEMPO'
         when d % 7 = 4 then 'INTERVALS'
         when d % 7 = 6 then 'REST'
         else 'EASY'
       end,
       'Workout ' || d,
       case when d % 7 in (0, 2, 4) then round((8 + (d % 20))::numeric, 1) else round((4 + (d % 10))::numeric, 1) end,
       1800 + d * 30,
       case d % 7 when 2 then 'T' when 4 then 'I' else 'E' end,
       case when d <= 30 then 'BASE' when d <= 60 then 'BUILD' when d <= 85 then 'PEAK' when d <= 95 then 'TAPER' else 'RACE' end,
       case when d % 4 = 0 then 'DONE' when d % 13 = 0 then 'SKIPPED' else 'PLANNED' end
from public.plans p
cross join generate_series(1, 100) as d;

insert into public.run_logs (user_id, log_date, distance_km, duration_sec, avg_pace_sec_per_km, rpe, source, created_at)
select u.id,
       current_date - (g % 120),
       round((4 + (g % 160) / 10.0)::numeric, 1),
       1200 + (g % 2400),
       280 + (g % 80),
       1 + (g % 10),
       case when g % 4 = 0 then 'gps' else 'manual' end,
       (current_date - (g % 120)) + time '18:00' + (g % 60) * interval '1 minute'
from generate_series(1, 20000) as g
join perf_users u on u.n = (g % 200) + 1;

insert into public.friendships (requester_id, addressee_id, status, created_at, responded_at)
select a.id, b.id,
       case when k % 2 = 0 then 'pending' else 'accepted' end,
       now() - ((a.n * 3 + k) % 45) * interval '1 day',
       case when k % 2 = 0 then null else now() - ((a.n * 3 + k) % 45) * interval '1 day' end
from perf_users a
cross join generate_series(1, 10) as k
join perf_users b on b.n = ((a.n + k - 1) % 200) + 1;

insert into public.kudos (run_log_id, user_id, created_at)
select rl.id, u.id, rl.created_at + interval '2 hours'
from (
  select id, created_at, row_number() over (order by id) as rn
  from public.run_logs
  limit 5000
) rl
join perf_users u on u.n = ((rl.rn * 7) % 200) + 1;

insert into public.shoes (user_id, name, initial_km, retired, created_at)
select u.id, 'Shoe ' || k, (u.n * k) % 600, k = 2, now() - (u.n % 400) * interval '1 day'
from perf_users u
cross join generate_series(1, 2) as k;

insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
select u.id, 'https://push.example.com/' || u.n || '/' || k, 'p256dh', 'auth', now() - (u.n + k) * interval '1 hour'
from perf_users u
cross join generate_series(1, 2) as k
where u.n % 2 = 0;

analyze;
