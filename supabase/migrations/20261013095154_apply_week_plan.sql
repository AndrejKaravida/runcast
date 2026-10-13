create function public.apply_week_plan(p_assignments jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_rows integer;
  v_total integer := 0;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_assignments is null or jsonb_typeof(p_assignments) <> 'array' then
    raise exception 'assignments must be a json array';
  end if;

  for v_item in select value from jsonb_array_elements(p_assignments) loop
    if (v_item ->> 'id') is null then raise exception 'workout id required'; end if;
    if (v_item ->> 'status') is not null and v_item ->> 'status' <> 'SKIPPED' then
      raise exception 'status not allowed';
    end if;

    update public.workouts w
       set workout_date = coalesce((v_item ->> 'date')::date, w.workout_date),
           status = coalesce(v_item ->> 'status', w.status)
      from public.plans p
     where w.id = (v_item ->> 'id')::uuid
       and w.user_id = v_user_id
       and w.status = 'PLANNED'
       and p.id = w.plan_id
       and (
         v_item ->> 'date' is null
         or (v_item ->> 'date')::date between p.start_date and p.race_date
       );
    get diagnostics v_rows = row_count;
    v_total := v_total + v_rows;
  end loop;

  return v_total;
end;
$$;

revoke execute on function public.apply_week_plan from public, anon;
grant execute on function public.apply_week_plan to authenticated;
