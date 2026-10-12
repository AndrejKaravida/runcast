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

  delete from public.plans where user_id = v_user_id and status = 'ACTIVE';

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
