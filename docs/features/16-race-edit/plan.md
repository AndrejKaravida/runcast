# F16 — Edit trke (izmena ciljne trke)

Cilj: korisnik može da **izmeni postojeću trku** (naziv, datum, distancu, ciljno vreme) bez
generisanja novog plana; opciono odmah da regeneriše plan po izmenjenim podacima.

## Trenutno stanje (recon)

- `races` tabela (`init_schema.sql:21-29`): name, race_date, distance_km, goal_time_sec;
  `plans.race_id` FK. Kreira se samo kroz `create_plan_with_workouts` RPC pri generisanju
  (onboarding + `SettingsPlanPage`). **Nema update/delete puta nigde u app/src.**
- Prikaz: `RaceChip` (Danas, `race-chip` testid), `SettingsPlanPage.tsx:119-148` race kartica,
  `PlanPage` header, `RaceDayPage`, `StatsPage`.

## Implementacija

1. **RLS**: proveriti `races` politike; dodati `update` (owner: `user_id = auth.uid()`? tabela
   verovatno nema user_id — veže se kroz `plans`; proveriti šemu i dodati politiku preko
   `exists (select 1 from plans p where p.race_id = races.id and p.user_id = auth.uid())`
   ili kolonu `user_id` na races ako je čistije; migracija).
2. **Hook**: `useUpdateRace()` u `features/plans/queries.ts` (ili `features/races/`):
   `update({ id, name, race_date, distance_km, goal_time_sec })`; invalidacija `['plans']`,
   `['plan']`, `['races']`.
3. **UI**: na `SettingsPlanPage` race kartica dobija „Uredi" akciju; forma u modalnom stilu
   postojećih (`AppModal`) sa poljima iz `PlanFields` race/goal grupa (naziv, datum, distanca,
   ciljno vreme) + validacija (`validatePlanDraft` race deo). Posle uspeha: toast/notice
   „Trka je izmenjena" i **ponuda** „Regeneriši plan po novim podacima?" (dugme, ne auto).
   Datum/distancija promena menjaju trajanje plana → regeneracija je eksplicitna.
4. **Prikaz**: RaceChip/PlanPage/RaceDay čitaju iz iste `races`/`plans` query — bez izmena
   osim ako nemaju keširan naziv.
5. **E2E** `race-edit.spec.ts`: onboarding → /settings/plan → Uredi → promeni naziv i ciljno
   vreme → sačuvaj → kartica i RaceChip (Danas) prikazuju novo; promeni datum → ponuda za
   regeneraciju radi.

## Van v1

Više aktivnih trka odjednom (multi-race), brisanje trke bez plana, istorija izmena.
