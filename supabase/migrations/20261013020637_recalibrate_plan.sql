create function public.recalibrate_plan(p_anchor jsonb, p_paces jsonb, p_pace_map jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_anchor is null or p_paces is null or p_pace_map is null then
    raise exception 'missing parameters';
  end if;

  select id into v_plan_id
    from public.plans
   where user_id = v_user_id and status = 'ACTIVE'
   order by created_at desc
   limit 1;

  if v_plan_id is null then raise exception 'no active plan'; end if;

  update public.plans
     set anchor = p_anchor,
         paces = p_paces
   where id = v_plan_id and user_id = v_user_id;

  update public.workouts w
     set steps = case
       when jsonb_typeof(w.steps) = 'array' then coalesce((
         select jsonb_agg(
           case
             when (step ->> 'pace') is not null and p_pace_map ? (step ->> 'pace')
               then jsonb_set(step, '{pace}', to_jsonb(p_pace_map ->> (step ->> 'pace')))
             else step
           end order by ordinality
         )
         from jsonb_array_elements(w.steps) with ordinality as elements(step, ordinality)
       ), '[]'::jsonb)
       else w.steps
     end
   where w.plan_id = v_plan_id
     and w.user_id = v_user_id
     and w.status = 'PLANNED'
     and w.workout_date >= current_date;
end;
$$;

revoke execute on function public.recalibrate_plan from public, anon;
grant execute on function public.recalibrate_plan to authenticated;
