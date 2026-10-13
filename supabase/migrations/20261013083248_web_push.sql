create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  language text not null default 'sr',
  remind_training boolean not null default true,
  remind_race_week boolean not null default true,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_own on public.push_subscriptions
for select using (user_id = (select auth.uid()));

create policy push_subscriptions_insert_own on public.push_subscriptions
for insert with check (user_id = (select auth.uid()));

create policy push_subscriptions_update_own on public.push_subscriptions
for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy push_subscriptions_delete_own on public.push_subscriptions
for delete using (user_id = (select auth.uid()));

create table public.push_config (
  id integer primary key check (id = 1),
  vapid_public text,
  vapid_private text,
  cron_secret text,
  created_at timestamptz not null default now()
);

alter table public.push_config enable row level security;

create function public.get_push_public_key()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select vapid_public from public.push_config where id = 1;
$$;

revoke execute on function public.get_push_public_key() from public, anon;
grant execute on function public.get_push_public_key() to authenticated;
