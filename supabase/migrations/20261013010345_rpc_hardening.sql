create function public.log_workout(
  p_workout_id uuid, p_distance_km numeric, p_duration_sec integer, p_rpe integer, p_notes text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workout_date date;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select workout_date into v_workout_date
    from public.workouts
   where id = p_workout_id and user_id = v_user_id and status = 'PLANNED';

  if v_workout_date is null then raise exception 'workout not found or not planned'; end if;

  insert into public.run_logs (user_id, workout_id, log_date, distance_km, duration_sec, avg_pace_sec_per_km, rpe, notes)
  values (v_user_id, p_workout_id, v_workout_date, p_distance_km, p_duration_sec,
          round(p_duration_sec::numeric / nullif(p_distance_km, 0))::integer, p_rpe, nullif(p_notes, ''));

  update public.workouts
     set status = 'DONE'
   where id = p_workout_id and user_id = v_user_id;
end;
$$;

create function public.scale_week_volume(p_week_start date, p_factor numeric)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_factor < 0.6 or p_factor > 1.15 then raise exception 'factor out of range'; end if;

  update public.workouts w
     set distance_km = greatest(2, round(w.distance_km * p_factor, 1)),
         steps = case
           when jsonb_typeof(w.steps) = 'array' then coalesce((
             select jsonb_agg(
               case
                 when (step ->> 'distanceKm') is null then step
                 else jsonb_set(step, '{distanceKm}', to_jsonb(round((step ->> 'distanceKm')::numeric * p_factor, 1)))
               end order by ordinality
             )
             from jsonb_array_elements(w.steps) with ordinality as elements(step, ordinality)
           ), '[]'::jsonb)
           else w.steps
         end
   where w.user_id = v_user_id
     and w.status = 'PLANNED'
     and w.type in ('EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS')
     and w.workout_date between p_week_start and p_week_start + 6;
end;
$$;

create or replace function public.create_plan_with_workouts(
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

  update public.profiles
     set onboarding_completed = true,
         updated_at = now()
   where id = v_user_id;

  return v_plan_id;
end;
$$;

revoke execute on function public.log_workout from public, anon;
grant execute on function public.log_workout to authenticated;
revoke execute on function public.scale_week_volume from public, anon;
grant execute on function public.scale_week_volume to authenticated;
