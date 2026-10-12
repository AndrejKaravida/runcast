alter table public.workouts drop constraint if exists workouts_type_check;
alter table public.workouts add constraint workouts_type_check
  check (type in ('EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'REST', 'RACE', 'STRENGTH'));
