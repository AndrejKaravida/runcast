alter table public.profiles
  add column premium boolean not null default false,
  add column premium_since timestamptz;
