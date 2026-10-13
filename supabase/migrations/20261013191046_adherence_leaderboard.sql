create function public.adherence_weekly_leaderboard(p_week_start date)
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
      from totals t where t.public_profile
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

create function public.friends_adherence_leaderboard(p_week_start date)
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
  with visible_ids as (
    select (select auth.uid()) as id
    union
    select case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
      from public.friendships f
     where f.status = 'accepted'
       and (f.requester_id = (select auth.uid()) or f.addressee_id = (select auth.uid()))
       and not public.is_blocked_with(
         case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
       )
  ), week_km as (
    select rl.user_id, round(sum(coalesce(rl.distance_km, 0)), 1) as distance_km
      from public.run_logs rl
     where rl.log_date >= p_week_start and rl.log_date < p_week_start + 7
       and rl.user_id in (select v.id from visible_ids v)
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
       and w.user_id in (select v.id from visible_ids v)
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
           dense_rank() over (order by t.adherence desc, t.distance_km desc) as rnk
      from totals t
  )
  select r.user_id, r.display_name, r.avatar_url, r.prescribed, r.done, r.adherence,
         r.distance_km, r.rnk::integer, r.public_profile
    from ranked r
   order by r.rnk, r.display_name, r.user_id;
end;
$$;

revoke execute on function public.adherence_weekly_leaderboard(date) from public, anon;
revoke execute on function public.friends_adherence_leaderboard(date) from public, anon;

grant execute on function public.adherence_weekly_leaderboard(date) to authenticated;
grant execute on function public.friends_adherence_leaderboard(date) to authenticated;
