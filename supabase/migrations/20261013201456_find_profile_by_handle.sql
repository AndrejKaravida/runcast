create function public.find_profile_by_handle(p_query text)
returns table (id uuid, display_name text, avatar_url text)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_url
    from public.profiles p
   where lower(p.username) = lower(regexp_replace(btrim(p_query), '^@', ''))
      or (
        p.display_name is not null
        and lower(p.display_name) = lower(btrim(p_query))
      )
   order by p.created_at
   limit 1;
$$;

revoke execute on function public.find_profile_by_handle(text) from public, anon;

grant execute on function public.find_profile_by_handle(text) to authenticated;

drop function public.find_profile_by_name(text);
