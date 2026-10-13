alter table public.profiles
  add column avatar_url text,
  add column public_profile boolean not null default false;

create index on public.run_logs (log_date);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg']) on conflict (id) do nothing;

create policy avatars_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy avatars_select_own on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy avatars_update_own on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy avatars_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create function public.weekly_leaderboard(p_week_start date)
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
  with week_stats as (
    select rl.user_id, round(sum(coalesce(rl.distance_km, 0)), 1) as distance_km, count(*)::integer as sessions
      from public.run_logs rl
     where rl.log_date >= p_week_start and rl.log_date < p_week_start + 7
     group by rl.user_id
  ), totals as (
    select p.id as user_id, p.display_name, p.avatar_url, p.public_profile,
           coalesce(s.distance_km, 0) as distance_km, coalesce(s.sessions, 0) as sessions
      from public.profiles p left join week_stats s on s.user_id = p.id
  ), ranked as (
    select t.user_id, t.display_name, t.avatar_url, t.distance_km, t.sessions, t.public_profile,
           row_number() over (order by t.distance_km desc, t.display_name, t.user_id) as rn,
           dense_rank() over (order by t.distance_km desc) as rnk
      from totals t where t.public_profile
  )
  select r.user_id, r.display_name, r.avatar_url, r.distance_km, r.sessions, r.rnk::integer, true
    from ranked r where r.rn <= 20
  union
  select t.user_id, t.display_name, t.avatar_url, t.distance_km, t.sessions,
         (select r.rnk::integer from ranked r where r.user_id = t.user_id), t.public_profile
    from totals t where t.user_id = (select auth.uid());
end;
$$;

revoke execute on function public.weekly_leaderboard(date) from public, anon;
grant execute on function public.weekly_leaderboard(date) to authenticated;
