# Review SUMMARY (v1.3 R2) — konsolidacija 6 review agenata

Izvori: `docs/review/01-shared.md` … `06-tooling.md`. Ovo je finalni plan popravki: P0/P1 se
implementiraju, P2 ide u „odloženo" (dokumentovano, ne radimo sada).

## P0 (obavezno)

1. **`todayIso()` je UTC** (`lib/dates.ts`) — posle 23h lokalno „danas" je sutra; kvari Today,
   streak, adherence, E2E helpere. Fix: lokalni kalendarski datum + lokalni weekday u helperima.
2. **Netransakcioni multi-write**: `useLogWorkout` (insert log + status DONE) i `useScaleWeek`
   (N update-a). Fix: nove RPC `log_workout` i `scale_week_volume` (jedna migracija), klijent
   poziva RPC; skaliranje distance+steps server-side.
3. **Settings deli jedno nesnimljeno stanje** za Profil i Trening — izmene se mešaju/pogrešno
   čuvaju. Fix: jedan izvor istine za profil-formu i jedan jasan „Sačuvaj profil" tok; sekcije
   samo prikazuju polja istog stanja (bez drugog save dugmeta koje čuva tuđe izmene).
4. **`useUpdateProfile` ne invalidira `['weather']`** — promena grada ostavlja staru prognozu.
   Fix: invalidacija prefiksa.

## P1 (implementiramo)

- **Shared**: `predict.ts` saturacija za VDOT < ~15 (guard); PB tolerancija ±2% → ±0,4% (da 21,0 km
  ne bude HM rekord); date helperi konsolidovati u `shared/src/dates.ts` (5 kopija); dead izraz
  `Math.max(daysPerWeek, 10)` → konstanta 10; round-trip test za `numeric(6,2)` distancu.
- **Data/infra**: `RequireOnboarding` error state (nema petlje pri padu profila).
- **Komponente**: `AppModal` refokus pri svakom renderu (onClose u deps → ref + deps [open]);
  i18n ostaci (`heroStats`, `phaseLabel`, „Koraci"/„Zabeleženo"/„Distanca"); raw dugmad →
  `IconButton` (focus-visible).
- **Strane A**: GPS bez fixa ne sme tiho upisati planiranu distancu u log; `void mutateAsync` bez
  catch (swap/skip/complete) + ignorisani `isError` (lažni prazni ekrani) → error state;
  RaceDayPage `distance_km <= 0` throw iz useMemo → guard.
- **Strane B**: konsolidovati dupliranu plan-formu onboarding ↔ Settings (~130 linija + divergirala
  validacija) u `PlanFields` + zajedničke validatore; **onboarding atomičnost** — `create_plan_with_workouts`
  RPC sada u istoj transakciji postavlja `profiles.onboarding_completed = true` (pad naknadnog
  profile update-a ne ostavlja korisnika u petlji); mrtav `PlanForm.volumeBand`; realizacija clamp.
- **Tooling**: `_headers` — `geolocation=(self)` (guided GPS!) i `img-src` + `https://*.supabase.co`
  (sprema za avatare); backup na javnom repou → šifrovanje dumpa (secret `BACKUP_PASSPHRASE`);
  CI job za validaciju migracija (`supabase start` + `db reset`); E2E onboarding → mock geocoding
  (nema više živih Open-Meteo poziva u 29 specova).

## P2 (odloženo — zapisano u review fajlovima)

Split velikih strana (Today 406 / GuidedRun 366), formatKm duplikati, heroStats dedupe, E2E
literali vs i18n, Playwright sharding, `config.toml` rate-limit podešavanja, docs/format kapije itd.

## Redosled implementacije

A (shared) ∥ D (tooling) → B (data + migracije) → C1 (komponente + strane A) → C2 (strane B) →
F (gamifikacija / profil+social / benchmark) → finalna kapija.
