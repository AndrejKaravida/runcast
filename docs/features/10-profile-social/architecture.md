# F10 — Arhitektura: migracije, hookovi, komponente, E2E

## Migracija

`npx supabase migration new profile_social` → `supabase/migrations/<version>_profile_social.sql`
(ručno napisan SQL ispod).

```sql
alter table public.profiles
  add column avatar_url text,
  add column public_profile boolean not null default false;

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
```

### `weekly_leaderboard` — security definer (obrazloženje u `research.md` §6)

```sql
create function public.weekly_leaderboard(p_week_start date)
returns table (user_id uuid, display_name text, avatar_url text,
               distance_km numeric, sessions integer, rank integer, is_public boolean)
language plpgsql security definer stable set search_path = ''
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
    select p.id as user_id, coalesce(p.display_name, 'Trkač') as display_name, p.avatar_url, p.public_profile,
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
```

- Klijent šalje `startOfWeekIso(todayIso())` (isti ponedeljak kao Stats); `run_logs
(user_id, log_date)` indeks pokriva filter, nov indeks nije potreban.
- Nejavni pozivalac dobija svoj red (`rank = null, is_public = false`) za UI CTA; `union`
  dedupuje red ako je pozivalac u top 20. Izlaz fiksiran — bez parametara koji menjaju obim.

## Tipovi i hookovi

- `app/src/types/database.ts`: `profiles` Row/Insert/Update + `avatar_url: string | null`,
  `public_profile: boolean`; `Functions.weekly_leaderboard: Args { p_week_start: string };
Returns: { user_id, display_name, avatar_url, distance_km, sessions, rank, is_public }[]`.
- `app/src/features/profile/avatar.ts`: `resizeAvatar(file: File): Promise<Blob>` —
  validacija (`file.type.startsWith('image/')`, `size <= 10 MB`), `createImageBitmap(file,
{ imageOrientation: 'from-image' })`, center-crop kvadrat, `canvas` 512×512,
  `toBlob('image/jpeg', 0.85)`; bez depova.
- `app/src/features/profile/queries.ts`: `useUploadAvatar()` — `resizeAvatar` →
  `supabase.storage.from('avatars').upload(`${userId}/avatar.jpg`, blob,
{ upsert: true, contentType: 'image/jpeg', cacheControl: '3600' })` → `getPublicUrl` →
  `update profiles.avatar_url = url + '?v=' + Date.now()` → `setQueryData(['profile', userId])`.
- `app/src/features/social/queries.ts` (novi): `useLeaderboard(weekStart)` — queryKey
  `['leaderboard', weekStart]`, `supabase.rpc('weekly_leaderboard', { p_week_start: weekStart })`.
  `useUpdateProfile.onSuccess` invalidisati i `['leaderboard']`.
- Bez `storage` listinga; render avatara = direktan public URL u `<img>`.

## Komponente i ruta

- `app/src/components/profile/AvatarUpload.tsx`: hidden file input
  (`data-testid="avatar-input"`), preview (avatar ili inicijali), dugme „Promeni avatar“,
  lokalni error tekst; koristi `useUploadAvatar`.
- `app/src/components/social/LeaderboardCard.tsx` (redovi `data-testid="leaderboard-row"`):
  rang, avatar/inicijali, ime, `km · N treninga`, „Ti“ badge, uporedna linija i empty state
  (copy u `plan.md`).
- `app/src/pages/LeaderboardPage.tsx` + `router.tsx`: lazy ruta `/leaderboard` unutar
  `TabLayout` children (pored `/stats`, bez novog taba). Ulaz: `SectionHeader action` na Stats
  i link u Settings.
- `SettingsPage.tsx`: `ProfileForm` dobija `publicProfile: boolean`; `profileFormFrom` čita
  `profile.public_profile`; `handleSaveProfile` šalje `public_profile`; `SegmentedControl`
  „Javni profil“ + `AvatarUpload` u `Profil` kartici. Ostali upiti i selektori netaknuti.

## E2E (`app/e2e/profile.spec.ts`, Playwright)

- Fixture `app/e2e/fixtures/avatar.png` (8×8 PNG); `register` + `completeOnboarding` iz `helpers.ts`, forecast/AQI mock kao u `app.spec.ts`.
- Test 1 — avatar: `/settings` → `Ime` → `setInputFiles('[data-testid="avatar-input"]',
fixtures/avatar.png)` → `img[alt="Avatar"]` `src` sadrži
  `/storage/v1/object/public/avatars/<uid>/avatar.jpg` i `?v=`; reload → isti `src`.
- Test 2 — rang lista: (a) svež korisnik → `goto('/leaderboard')` → empty state
  „Rang lista je još prazna“; (b) `/settings` → „Uključeno“ u „Javni profil“ → „Sačuvaj
  profil“ → `/leaderboard` → red sa imenom + „Ti“, tekst „Ti si #1 ove nedelje.“ (0 km je i
  dalje rangiran kao jedini javni); `page.content()` ne sadrži email.
- Bez izmena postojećih spec fajlova; fixture je jedini novi artefakt.

## Fajlovi

`supabase/migrations/<version>_profile_social.sql`, `app/src/types/database.ts`, `app/src/features/profile/{avatar.ts,queries.ts}`,
`app/src/features/social/queries.ts`, `app/src/components/profile/AvatarUpload.tsx`, `app/src/components/social/LeaderboardCard.tsx`,
`app/src/pages/LeaderboardPage.tsx`, `app/src/router.tsx`, `app/src/pages/{SettingsPage,StatsPage}.tsx`, `app/e2e/{profile.spec.ts,fixtures/avatar.png}`.
Bez novih paketa i bez izmena `TabLayout`.
