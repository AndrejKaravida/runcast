-- friendships: freeze the pair columns

create function public.enforce_friendship_pair_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id
  then
    raise exception 'friendship pair is immutable';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_friendship_pair_immutable() from public, anon, authenticated;

create trigger enforce_friendship_pair_immutable
before update on public.friendships
for each row
execute function public.enforce_friendship_pair_immutable();

-- friendships: server-side request quotas

create function public.can_send_friend_request()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select
    (select count(*) from public.friendships
      where requester_id = (select auth.uid()) and status = 'pending') < 100
    and (select count(*) from public.friendships
      where requester_id = (select auth.uid()) and created_at > now() - interval '1 day') < 20;
$$;

revoke execute on function public.can_send_friend_request() from public, anon;
grant execute on function public.can_send_friend_request() to authenticated;

drop policy if exists friendships_insert_requester on public.friendships;
create policy friendships_insert_requester on public.friendships
for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'pending'
  and not public.is_blocked_with(addressee_id)
  and public.can_send_friend_request()
);

-- profiles: pending requests expose the requester only to the addressee

create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select public.is_friend_or_self(p_profile_id)
    or exists (
      select 1 from public.friendships f
       where f.addressee_id = (select auth.uid())
         and f.requester_id = p_profile_id
         and f.status = 'pending'
    );
$$;

-- run_logs: child references must be owned

drop policy if exists run_logs_insert_own on public.run_logs;
create policy run_logs_insert_own on public.run_logs
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (workout_id is null
       or exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid())))
  and (shoe_id is null
       or exists (select 1 from public.shoes s where s.id = shoe_id and s.user_id = (select auth.uid())))
);

drop policy if exists run_logs_update_own on public.run_logs;
create policy run_logs_update_own on public.run_logs
for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (workout_id is null
       or exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid())))
  and (shoe_id is null
       or exists (select 1 from public.shoes s where s.id = shoe_id and s.user_id = (select auth.uid())))
);

-- profile search quota

create table public.rpc_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  rpc text not null,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0,
  primary key (user_id, rpc)
);

alter table public.rpc_rate_limits enable row level security;

revoke all on table public.rpc_rate_limits from anon, authenticated;

create function public.consume_rpc_quota(p_rpc text, p_max integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_attempts integer;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_rpc is null or p_max is null or p_max < 1 or p_window is null or p_window <= interval '0' then
    raise exception 'invalid quota';
  end if;

  insert into public.rpc_rate_limits as limits (user_id, rpc, window_started_at, attempts)
  values (v_user_id, p_rpc, now(), 1)
  on conflict (user_id, rpc) do update
    set attempts = case
          when limits.window_started_at < now() - p_window then 1
          else limits.attempts + 1
        end,
        window_started_at = case
          when limits.window_started_at < now() - p_window then now()
          else limits.window_started_at
        end
  returning attempts into v_attempts;

  if v_attempts > p_max then raise exception 'rate limit exceeded'; end if;
end;
$$;

revoke execute on function public.consume_rpc_quota(text, integer, interval) from public, anon, authenticated;

create or replace function public.find_profile_by_handle(p_query text)
returns table (id uuid, display_name text, avatar_url text)
language plpgsql
security definer
volatile
set search_path = ''
as $$
begin
  perform public.consume_rpc_quota('find_profile_by_handle', 100, interval '1 day');

  return query
  select p.id, p.display_name, p.avatar_url
    from public.profiles p
   where lower(p.username) = lower(regexp_replace(btrim(p_query), '^@', ''))
      or (
        p.display_name is not null
        and lower(p.display_name) = lower(btrim(p_query))
      )
   order by p.created_at
   limit 1;
end;
$$;

-- leaderboards: hide blocked users

create or replace function public.weekly_leaderboard(p_week_start date)
returns table (user_id uuid, display_name text, avatar_url text,
               distance_km numeric, sessions integer, rank integer, is_public boolean)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if p_week_start is null then raise exception 'week start required'; end if;
  return query
  with week_stats as (
    select rl.user_id, round(sum(coalesce(rl.distance_km, 0)), 1) as distance_km, count(*)::integer as sessions
      from public.run_logs rl
     where rl.log_date >= p_week_start and rl.log_date < p_week_start + 7
     group by rl.user_id
  ), totals as (
    select p.id as user_id, p.display_name, p.avatar_url, p.public_profile,
           coalesce(s.distance_km, 0) as distance_km, coalesce(s.sessions, 0) as sessions
      from public.profiles p left join week_stats s on s.user_id = p.id
  ), ranked as (
    select t.user_id, t.display_name, t.avatar_url, t.distance_km, t.sessions, t.public_profile,
           row_number() over (order by t.distance_km desc, t.display_name, t.user_id) as rn,
           dense_rank() over (order by t.distance_km desc) as rnk
      from totals t where t.public_profile and not public.is_blocked_with(t.user_id)
  )
  select r.user_id, r.display_name, r.avatar_url, r.distance_km, r.sessions, r.rnk::integer, true
    from ranked r where r.rn <= 20
  union
  select t.user_id, t.display_name, t.avatar_url, t.distance_km, t.sessions,
         (select r.rnk::integer from ranked r where r.user_id = t.user_id), t.public_profile
    from totals t where t.user_id = (select auth.uid());
end;
$$;

create or replace function public.adherence_weekly_leaderboard(p_week_start date)
returns table (user_id uuid, display_name text, avatar_url text,
               prescribed integer, done integer, adherence integer,
               distance_km numeric, rank integer, is_public boolean)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if p_week_start is null then raise exception 'week start required'; end if;
  return query
  with week_km as (
    select rl.user_id, round(sum(coalesce(rl.distance_km, 0)), 1) as distance_km
      from public.run_logs rl
     where rl.log_date >= p_week_start and rl.log_date < p_week_start + 7
     group by rl.user_id
  ), week_plan as (
    select w.user_id,
           count(*)::integer as prescribed,
           count(*) filter (where w.status = 'DONE')::integer as done
      from public.workouts w
      join public.plans pl on pl.id = w.plan_id
     where pl.status = 'ACTIVE'
       and pl.start_date <= p_week_start + 6
       and pl.race_date >= p_week_start
       and w.workout_date >= p_week_start and w.workout_date < p_week_start + 7
       and w.type in ('TEMPO', 'INTERVALS', 'REPETITIONS', 'EASY', 'LONG', 'RACE')
     group by w.user_id
    having count(*) >= 2
  ), totals as (
    select p.id as user_id, p.display_name, p.avatar_url, p.public_profile,
           s.prescribed, s.done,
           round(100.0 * s.done / s.prescribed)::integer as adherence,
           coalesce(k.distance_km, 0) as distance_km
      from public.profiles p
      join week_plan s on s.user_id = p.id
      left join week_km k on k.user_id = p.id
  ), ranked as (
    select t.user_id, t.display_name, t.avatar_url, t.prescribed, t.done, t.adherence,
           t.distance_km, t.public_profile,
           row_number() over (order by t.adherence desc, t.distance_km desc, t.display_name, t.user_id) as rn,
           dense_rank() over (order by t.adherence desc, t.distance_km desc) as rnk
      from totals t where t.public_profile and not public.is_blocked_with(t.user_id)
  )
  select r.user_id, r.display_name, r.avatar_url, r.prescribed, r.done, r.adherence,
         r.distance_km, r.rnk::integer, true
    from ranked r where r.rn <= 20
  union
  select t.user_id, t.display_name, t.avatar_url, t.prescribed, t.done, t.adherence,
         t.distance_km, (select r.rnk::integer from ranked r where r.user_id = t.user_id), t.public_profile
    from totals t where t.user_id = (select auth.uid());
end;
$$;

-- policies: initplan auth.uid() and authenticated role

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists races_select_own on public.races;
create policy races_select_own on public.races
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists races_insert_own on public.races;
create policy races_insert_own on public.races
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists races_delete_own on public.races;
create policy races_delete_own on public.races
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists plans_select_own on public.plans;
create policy plans_select_own on public.plans
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists plans_delete_own on public.plans;
create policy plans_delete_own on public.plans
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists workouts_select_own on public.workouts;
create policy workouts_select_own on public.workouts
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists workouts_delete_own on public.workouts;
create policy workouts_delete_own on public.workouts
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists run_logs_delete_own on public.run_logs;
create policy run_logs_delete_own on public.run_logs
for delete to authenticated
using (user_id = (select auth.uid()));

-- privileges: drop unused table privileges

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;
