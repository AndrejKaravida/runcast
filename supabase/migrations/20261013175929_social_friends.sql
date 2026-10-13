create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

create unique index friendships_pair_uidx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index friendships_requester_idx on public.friendships (requester_id);
create index friendships_addressee_idx on public.friendships (addressee_id);

create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.kudos (
  run_log_id uuid not null references public.run_logs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (run_log_id, user_id)
);

create index kudos_user_idx on public.kudos (user_id);

alter table public.friendships enable row level security;
alter table public.blocks enable row level security;
alter table public.kudos enable row level security;

create function public.is_blocked_with(p_other_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
     where (b.blocker_id = (select auth.uid()) and b.blocked_id = p_other_id)
        or (b.blocker_id = p_other_id and b.blocked_id = (select auth.uid()))
  );
$$;

create function public.is_friend_or_self(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select p_user_id = (select auth.uid())
    or (
      not public.is_blocked_with(p_user_id)
      and exists (
        select 1 from public.friendships f
         where f.status = 'accepted'
           and ((f.requester_id = (select auth.uid()) and f.addressee_id = p_user_id)
             or (f.addressee_id = (select auth.uid()) and f.requester_id = p_user_id))
      )
    );
$$;

create function public.can_view_run_log(p_run_log_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.run_logs rl
     where rl.id = p_run_log_id
       and public.is_friend_or_self(rl.user_id)
  );
$$;

create function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select public.is_friend_or_self(p_profile_id)
    or exists (
      select 1 from public.friendships f
       where (f.requester_id = (select auth.uid()) and f.addressee_id = p_profile_id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = p_profile_id)
    );
$$;

create function public.find_profile_by_name(p_name text)
returns table (id uuid, display_name text, avatar_url text)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_url
    from public.profiles p
   where p.display_name is not null
     and lower(p.display_name) = lower(btrim(p_name))
   order by p.created_at
   limit 1;
$$;

create policy profiles_select_social on public.profiles
for select to authenticated
using (public.can_view_profile(id) and not public.is_blocked_with(id));

create policy friendships_select_pair on public.friendships
for select to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

create policy friendships_insert_requester on public.friendships
for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'pending'
  and not public.is_blocked_with(addressee_id)
);

create policy friendships_update_pair on public.friendships
for update to authenticated
using ((select auth.uid()) in (requester_id, addressee_id))
with check (
  (select auth.uid()) in (requester_id, addressee_id)
  and (status = 'pending' or addressee_id = (select auth.uid()))
);

create policy friendships_delete_pair on public.friendships
for delete to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

create policy blocks_select_own on public.blocks
for select to authenticated
using (blocker_id = (select auth.uid()));

create policy blocks_insert_own on public.blocks
for insert to authenticated
with check (blocker_id = (select auth.uid()));

create policy blocks_delete_own on public.blocks
for delete to authenticated
using (blocker_id = (select auth.uid()));

create policy kudos_select_visible on public.kudos
for select to authenticated
using (public.can_view_run_log(run_log_id));

create policy kudos_insert_own on public.kudos
for insert to authenticated
with check (user_id = (select auth.uid()) and public.can_view_run_log(run_log_id));

create policy kudos_delete_own on public.kudos
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy run_logs_select_own on public.run_logs;

create policy run_logs_select_visible on public.run_logs
for select to authenticated
using (user_id = (select auth.uid()) or public.is_friend_or_self(user_id));

create function public.friends_weekly_leaderboard(p_week_start date)
returns table (user_id uuid, display_name text, avatar_url text,
               distance_km numeric, sessions integer, rank integer, is_public boolean)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if p_week_start is null then raise exception 'week start required'; end if;
  return query
  with visible_ids as (
    select (select auth.uid()) as id
    union
    select case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
      from public.friendships f
     where f.status = 'accepted'
       and (f.requester_id = (select auth.uid()) or f.addressee_id = (select auth.uid()))
       and not public.is_blocked_with(
         case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
       )
  ), week_stats as (
    select rl.user_id, round(sum(coalesce(rl.distance_km, 0)), 1) as distance_km, count(*)::integer as sessions
      from public.run_logs rl
     where rl.log_date >= p_week_start and rl.log_date < p_week_start + 7
       and rl.user_id in (select v.id from visible_ids v)
     group by rl.user_id
  ), totals as (
    select p.id as user_id, p.display_name, p.avatar_url, p.public_profile,
           coalesce(s.distance_km, 0) as distance_km, coalesce(s.sessions, 0) as sessions
      from public.profiles p
      join visible_ids v on v.id = p.id
      left join week_stats s on s.user_id = p.id
  ), ranked as (
    select t.user_id, t.display_name, t.avatar_url, t.distance_km, t.sessions, t.public_profile,
           dense_rank() over (order by t.distance_km desc) as rnk
      from totals t
  )
  select r.user_id, r.display_name, r.avatar_url, r.distance_km, r.sessions, r.rnk::integer, r.public_profile
    from ranked r
   order by r.rnk, r.display_name, r.user_id;
end;
$$;

revoke execute on function public.is_blocked_with(uuid) from public, anon;
revoke execute on function public.is_friend_or_self(uuid) from public, anon;
revoke execute on function public.can_view_run_log(uuid) from public, anon;
revoke execute on function public.can_view_profile(uuid) from public, anon;
revoke execute on function public.find_profile_by_name(text) from public, anon;
revoke execute on function public.friends_weekly_leaderboard(date) from public, anon;

grant execute on function public.is_blocked_with(uuid) to authenticated;
grant execute on function public.is_friend_or_self(uuid) to authenticated;
grant execute on function public.can_view_run_log(uuid) to authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.find_profile_by_name(text) to authenticated;
grant execute on function public.friends_weekly_leaderboard(date) to authenticated;
