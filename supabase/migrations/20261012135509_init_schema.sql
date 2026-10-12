create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  height_cm integer check (height_cm between 100 and 250),
  weight_kg numeric(5, 1) check (weight_kg between 30 and 250),
  birth_year integer check (birth_year between 1900 and 2100),
  sex text check (sex in ('male', 'female', 'other')),
  units text not null default 'km' check (units in ('km', 'mi')),
  city text,
  lat double precision,
  lon double precision,
  run_window text not null default 'morning' check (run_window in ('morning', 'evening', 'flexible')),
  weather_refresh_minutes integer check (weather_refresh_minutes in (30, 60, 180, 360, 720)),
  experience text check (experience in ('first', 'experienced')),
  volume_band text check (volume_band in ('lt20', '20-40', '40-60', 'gt60')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.races (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  race_date date not null,
  distance_km numeric(6, 2) not null default 42.195,
  goal_time_sec integer check (goal_time_sec > 0),
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  race_id uuid references public.races (id) on delete set null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
  start_date date not null,
  race_date date not null,
  weeks integer not null check (weeks between 1 and 30),
  days_per_week integer not null check (days_per_week between 3 and 6),
  long_run_day integer not null check (long_run_day between 0 and 6),
  experience text,
  volume_band text,
  anchor jsonb,
  paces jsonb,
  created_at timestamptz not null default now()
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete cascade,
  workout_date date not null,
  type text not null check (type in ('EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'REST', 'RACE')),
  title text not null,
  distance_km numeric(6, 2) not null default 0,
  duration_sec integer,
  pace_zone text check (pace_zone in ('E', 'M', 'T', 'I', 'R')),
  steps jsonb not null default '[]'::jsonb,
  phase text not null check (phase in ('BASE', 'BUILD', 'PEAK', 'TAPER', 'RACE')),
  status text not null default 'PLANNED' check (status in ('PLANNED', 'DONE', 'SKIPPED')),
  swapped_with uuid references public.workouts (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.run_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_id uuid references public.workouts (id) on delete set null,
  log_date date not null,
  distance_km numeric(6, 2),
  duration_sec integer,
  avg_pace_sec_per_km integer,
  rpe integer check (rpe between 1 and 10),
  notes text,
  created_at timestamptz not null default now()
);

create index on public.workouts (user_id, workout_date);
create index on public.run_logs (user_id, log_date);
create index on public.races (user_id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', null))
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.races enable row level security;
alter table public.plans enable row level security;
alter table public.workouts enable row level security;
alter table public.run_logs enable row level security;

create policy profiles_select_own on public.profiles
for select using (id = auth.uid());

create policy profiles_update_own on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy races_select_own on public.races
for select using (user_id = auth.uid());

create policy races_insert_own on public.races
for insert with check (user_id = auth.uid());

create policy races_update_own on public.races
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy races_delete_own on public.races
for delete using (user_id = auth.uid());

create policy plans_select_own on public.plans
for select using (user_id = auth.uid());

create policy plans_insert_own on public.plans
for insert with check (user_id = auth.uid());

create policy plans_update_own on public.plans
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy plans_delete_own on public.plans
for delete using (user_id = auth.uid());

create policy workouts_select_own on public.workouts
for select using (user_id = auth.uid());

create policy workouts_insert_own on public.workouts
for insert with check (user_id = auth.uid());

create policy workouts_update_own on public.workouts
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy workouts_delete_own on public.workouts
for delete using (user_id = auth.uid());

create policy run_logs_select_own on public.run_logs
for select using (user_id = auth.uid());

create policy run_logs_insert_own on public.run_logs
for insert with check (user_id = auth.uid());

create policy run_logs_update_own on public.run_logs
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy run_logs_delete_own on public.run_logs
for delete using (user_id = auth.uid());
