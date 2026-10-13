# TASKS v1.3 — lokalizacija, arhitekturalni review, nove feature

Tracker za tri velika dela. Redosled: **L (lokalizacija) → R (review) → F (feature)**, sa
paralelnim feature-istraživanjima (read-only) dok traje L. Status se ažurira u ovom fajlu.

## Status tracker

- [x] L1 — i18n infrastruktura (i18next, provider, switcher, datumi, <html lang>)
- [x] L2 — app stringovi → JSON (namespaces; 152+95+240+122 ključa kroz A/B/C)
- [x] L3 — shared generisani sadržaj → ključevi+parametri (explain/coach/fueling/raceday/guided cues)
- [x] L4 — locale E2E spec + puna kapija L (170 unit, 29 E2E, build 101 kB gzip)
- [x] R1 — 6 review agenata (shared / data+infra / komponente / strane A / strane B / tooling) → `docs/review/*`
- [x] R2 — konsolidacija u `docs/review/SUMMARY.md` (P0/P1/P2 + plan)
- [x] R3 — implementacija P0/P1 popravki
- [x] F1 — feature istraživanja (gamifikacija / profil+social / šta još fali) → docs/features/09-11 feature istraživanja (gamifikacija / profil+social / šta još fali)
- [x] F2 — implementacija: gamifikacija + profil/avatar/rang lista + benchmark recalibracija (33 E2E)
- [x] Final — 193 unit + 33 E2E; CI (uklj. migrations job) zelen; 7 migracija na prod bazi; Cloudflare deploy + prod smoke verifikovani format/typecheck/test/lint/build/E2E → commit+push → CI/deploy/prod verifikacija

---

## L — Lokalizacija

**Odluke (obavezno za sve L agente):**

- Lib: **i18next + react-i18next** (najpopularniji React i18n; JSON fajlovi; namespaces).
- Jezici: **sr (default, izvor)** + **en**. Fajlovi: `app/src/i18n/locales/{sr,en}/<namespace>.json`.
- **Namespace po domenu** (agent sme da dira SAMO svoje namespace fajlove — nema konflikata):
  `common`, `auth`, `onboarding`, `today`, `plan`, `workout`, `guided`, `stats`, `settings`,
  `race`, `content` (za shared generisani sadržaj).
- Detekcija jezika: `localStorage 'runcast.lang'` → `navigator.language` (sr* → sr, inače en).
  Playwright već ima `locale: 'sr-Latn-RS'` → default sr u svim postojećim E2E (oni ostaju zeleni!).
- Prevodilac u Settings: nova sekcija **„Jezik"** (SegmentedControl Srpski/English), uz „Izgled".
- `lib/dates.ts` + `WeatherSummaryCard` time format: locale iz i18n umesto hardkodovanog
  `'sr-Latn-RS'` (sr → `sr-Latn-RS`, en → `en-GB`). `<html lang>` se ažurira pri promeni.
- **DB-persistovani sadržaj**: `workouts.title` se generiše pri kreiranju plana (ostaje kao fallback).
  Run naslovi se u UI renderuju **lokalizovano iz strukture** (`workoutTitle(t, workout)`: EASY/LONG
  → distanca; TEMPO → min iz steps; INTERVALS/REPETITIONS → broj ponavljanja; RACE → distanca).
  STRENGTH naslovi i imena vežbi (persistovani u steps) ostaju srpski — **v1 ograničenje**, dokumentovati.
- E2E stabilnost: svi postojeći specovi (25) moraju ostati zeleni na sr; dodaje se `locale.spec.ts`
  (prebacivanje na en → ključni stringovi na engleskom → perzistira posle reload-a → nazad na sr).
- Bez `i18next-parser`/typegen alata; ključevi ručno, plain `t('namespace.key')`.

## R — Arhitekturalni review

- R1: 6 agenata paralelno, **read-only** (samo pišu `docs/review/NN-<oblast>.md`):
  1. `01-shared.md` — ceo `packages/shared` (plan-generator, strength, guided, explain, coach,
     predict, fueling, raceday, ics, vdot, weather, schemas, types).
  2. `02-data-infra.md` — `app/src/features/*`, `lib/*`, `auth/*`, `theme/`, `router.tsx`, `main.tsx`.
  3. `03-components.md` — `components/ui`, `layout`, `workouts`, `guided`, `weather`, `forms`.
  4. `04-pages-a.md` — Today, Plan, Workout, GuidedRun, RaceDay.
  5. `05-pages-b.md` — Stats, Settings, Onboarding, Login/Register/Reset/Forgot, NotFound.
  6. `06-tooling.md` — e2e specovi, playwright config, vite/tsconfig/eslint, workflows, bundle,
     i18n setup (posle L), Supabase migracije/RLS konzistentnost.
- Format po fajlu: tabela `fajl | nalaz | tip (bug/simplifikacija/duplikacija/overengineering/
best-practice/pattern) | severitet P0/P1/P2 | konkretna popravka`. + sekcija „šta je dobro" +
  top-5 prioriteta. Max ~150 linija.
- R2: ja konsolidujem u `docs/review/SUMMARY.md` (dedup, finalni P0/P1 plan, P2 lista „ne radimo sada").
- R3: implementacija P0/P1 (agenti po oblasti, sekvencijalno; E2E ostaje zelen; bez scope creep-a —
  P2 ide u dokumentaciju).

## F — Nove feature

- F1 istraživanja (3 agenta paralelno, read-only → `docs/features/09-*/…`):
  - `09-gamification` — badge/achievements/milestones/challenges u Strava/NRC/Runna/Garmin: šta
    motiviše, šta je dark pattern; predlog za RunCast (compute iz postojećih podataka, bez šeme).
  - `10-profile-social` — avatar upload (**Supabase Storage**: free tier, bucket politike, public
    URL, client-side resize), javni profil (opt-in), nedeljna rang lista (RLS-safe pristup:
    security definer RPC nad agregatima), privatnost.
  - `11-missing-features` — šta još fali vs Runna/Strava/NRC (shoe tracking, benchmark/test trke,
    web push, Strava sync, clubs…): tabela vrednost/trud, preporuka top-3.
- F2 implementacija: gamifikacija + profil/avatar/rang lista + 1 feature iz `11` preporuke
  (odlučujem posle istraživanja; shoe tracking ili benchmark trke). Migracije preko
  `npx supabase migration new` (ime=verzija!), RLS po postojećim obrascima, E2E spec po feature-u.

## Globalna pravila

- Postojeći E2E selektori se ne smeju lomiti (lista: `docs/features/CONTRACTS.md` §E2E stabilnost +
  svi novi specovi od v1.1/v1.2). Posle svake faze: `npm run typecheck`, `npm run test`,
  `npm run lint -w app`, relevantni E2E; na kraju pun suite.
- Bez komentara u kodu; srpski je izvorni jezik stringova; bez novih dependency-ja osim
  i18next/react-i18next (L) i eventualno `browser-image-compression` (F2, odobriću).
- Jedan agent = jedan vlasnik fajlova; L agenti dodatno: samo svoj namespace JSON.
