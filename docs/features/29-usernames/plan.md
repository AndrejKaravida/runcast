# F29 — Korisničko ime (@username) + pretraga prijatelja po imenu

Cilj: jedinstveno, deljivo korisničko ime (npr. `@andrej`) i pretraga prijatelja po njemu —
umesto oslanjanja samo na tačan `display_name`. Bez pretrage po email-u (GDPR, F17).

## Podaci (već primenjeno)

- `profiles.username text` + check `^[a-z0-9_]{3,20}$` + unique index na `lower(username)`
  (migracija `20261013200914_profile_username`). Nullable (postojeći korisnici ga dodaju).

## Implementacija

1. **Profil (SettingsProfilePage)**: polje „Korisničko ime" (prefix `@`, lowercase, hint
   „3-20 znakova: slova, brojevi, donja crta"), čuva se kroz `useUpdateProfile`; validacija na
   klijentu (regex) + mapiranje unique violation (23505) na „To korisničko ime je zauzeto.";
   rezervisana lista (runcast, admin, support, sistem…). Prazno = uklonjeno (null).
2. **Pretraga prijatelja (RPC)**: nova migracija — `find_profile_by_handle(p_query text)`:
   skida vodeći `@`, match `lower(username) = lower(query)` ILI tačan `display_name`
   (case-insensitive) kao i sada; vraća isto što i `find_profile_by_name`; stara funkcija se
   uklanja (nema drugih korisnika sem `useSendFriendRequest`). Rate limit i anti-abuse iz F17
   ostaju netaknuti.
3. **FriendsPage**: hint „Traži po korisničkom imenu (@ime) ili tačnom imenu profila";
   prikaz `@username` u redovima prijatelja i zahteva (kad postoji); **fix margina**: stranica
   je van TabLayout-a — dodati standalone wrapper (`mx-auto w-full max-w-[560px] px-4 py-6`)
   kao LeaderboardPage/BenchmarkPage.
4. **Ostalo**: username u export-u (automatski kroz profiles), bez promena RLS-a
   (`can_view_profile` ostaje), leaderboard ne prikazuje username (v1).
5. **E2E** `username.spec.ts`: postavi username u profilu → drugi korisnik traži `@username` →
   zahtev stiže; duplikat username → greška „zauzeto"; nevalidan format → validaciona greška;
   pretraga nepostojećeg → „nema rezultata"; FriendsPage ima margine (assert padding wrapper
   klase ili vizuelno preko bounding box-a).

## Van v1

Promena username-a sa istorijom (redirect), username na leaderboard-u/feed-u, onboarding korak
za username, verifikacija/badge.
