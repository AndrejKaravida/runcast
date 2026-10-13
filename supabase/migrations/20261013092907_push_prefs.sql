alter table public.push_subscriptions
  add column timezone text not null default 'Europe/Belgrade',
  add column remind_hour integer not null default 18 check (remind_hour between 5 and 22),
  add column remind_today boolean not null default true,
  add column remind_weather boolean not null default true,
  add column remind_missed boolean not null default true,
  add column remind_recap boolean not null default true;
