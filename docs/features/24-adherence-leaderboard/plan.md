# F24 — Adherence rang lista (diferencijator)

Cilj: nedeljna rang lista po **pridržavanju plana** (urađeno / propisano, %), ne po sirovom
volumenu — pravednija za sve nivoe i naš unikat u odnosu na Strava/NRC volumen-liste.

## Trenutno stanje

- `weekly_leaderboard(p_week_start)` (globalno, `public_profile` gate, top 20, km) i
  `friends_weekly_leaderboard` (F17). UI: LeaderboardPage sa segmentima Globalno/Prijatelji/Feed.
- `workouts.status`: PLANNED/DONE/SKIPPED/MOVED? (proveriti enum); REST tipovi se ne broje kao
  propisani.

## Implementacija

1. **Migracija** `npx supabase migration new adherence_leaderboard`:
   - `adherence_weekly_leaderboard(p_week_start date)` i `friends_adherence_leaderboard(
p_week_start date)`: za korisnike sa planom koji pokriva tu nedelju — `prescribed` =
     broj non-REST treninga te nedelje (bez MOBILITY? uključiti samo trčanje: TEMPO/INTERVALS/
     REPETITIONS/EASY/LONG/RACE), `done` = DONE; `adherence = round(100 * done / prescribed)`;
     uslov: `prescribed >= 2` (da se ne rangiraju prazni planovi); sort: adherence desc, pa
     `distance_km desc` (isti km agregat kao postojeći), top 20 + sopstveni red (union kao
     postojeći RPC); `public_profile` gate za globalni, friendship za friends varijantu.
   - Apply lokalno + `npm run db:types`.
2. **Queries**: `useAdherenceLeaderboard(weekStart, scope: 'global' | 'friends')` u
   `features/social/queries.ts` (mirror postojećih leaderboard hook-ova).
3. **UI (LeaderboardPage)**: mali SegmentedControl metrike iznad liste: „Kilometraža" /
   „Pridržavanje" (važi za Globalno i Prijatelji tab; Feed ne dira). U adherence režimu red
   prikazuje `done/prescribed` + `%` badge umesto km (zadrži avatar/ime/rank); tie-break km
   kao sekundarna informacija (caption). Empty state: „Nema dovoljno podataka o planu ove
   nedelje." Skeletoni postoje (F17/skeleton spec) — ne kvariti testide.
4. **i18n** `stats.json` sr/en: metrike, badge, empty state.
5. **E2E** `adherence.spec.ts`: dva korisnika sa planovima u istoj nedelji (helper + REST
   manipulacija statusa kao u realign spec): A: 2/2 DONE, B: 0/2 (ostavi PLANNED) → u
   „Pridržavanje" režimu A iznad B (100% vs 0%); prebaci na „Kilometraža" → redosled po km.
   Uključi `public_profile` preko settings (postojeći F17 tok) za oba.

## Van v1

RPE-težinska adherence (iskrenost), streak bonusi, mesečne adherence titule, prikaz adherence
u friends feed-u.
