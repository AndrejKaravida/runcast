create table public.shoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  initial_km numeric(7,1) not null default 0 check (initial_km >= 0),
  retired boolean not null default false,
  created_at timestamptz not null default now()
);

create index shoes_user_id_idx on public.shoes (user_id);

alter table public.shoes enable row level security;

create policy shoes_select_own on public.shoes
for select using (user_id = (select auth.uid()));

create policy shoes_insert_own on public.shoes
for insert with check (user_id = (select auth.uid()));

create policy shoes_update_own on public.shoes
for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy shoes_delete_own on public.shoes
for delete using (user_id = (select auth.uid()));

alter table public.run_logs
  add column shoe_id uuid references public.shoes (id) on delete set null;

drop function public.log_workout(uuid, numeric, integer, integer, text);

create function public.log_workout(
  p_workout_id uuid, p_distance_km numeric, p_duration_sec integer, p_rpe integer, p_notes text,
  p_shoe_id uuid default null
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

  if p_shoe_id is not null and not exists (
    select 1 from public.shoes where id = p_shoe_id and user_id = v_user_id
  ) then
    raise exception 'shoe not found';
  end if;

  insert into public.run_logs (user_id, workout_id, log_date, distance_km, duration_sec, avg_pace_sec_per_km, rpe, notes, shoe_id)
  values (v_user_id, p_workout_id, v_workout_date, p_distance_km, p_duration_sec,
          round(p_duration_sec::numeric / nullif(p_distance_km, 0))::integer, p_rpe, nullif(p_notes, ''), p_shoe_id);

  update public.workouts
     set status = 'DONE'
   where id = p_workout_id and user_id = v_user_id;
end;
$$;

revoke execute on function public.log_workout(uuid, numeric, integer, integer, text, uuid) from public, anon;
grant execute on function public.log_workout(uuid, numeric, integer, integer, text, uuid) to authenticated;
