# F19 — Poravnanje ostatka plana (multi-week realignment)

Cilj: kad korisnik propusti više treninga, jedan klik poravna **ostatak plana** (tekuća +
buduće nedelje): propušteni se označe SKIPPED, a PLANNED treninzi se rasporede po slobodnim
danima uz očuvan dugi trk na `longRunDay` i razmak quality dana.

## Trenutno stanje

- `planWeekAdjustments` (`packages/shared/src/rebalance-week.ts:47`): samo TEKUĆA nedelja
  (skip propuštenih + moves po slobodnim danima; long run na longRunDay, quality razmak 2-3
  dana). UI: PlanPage „Adaptiraj nedelju" kad ima propuštenih (`missedWorkouts.length > 0`).
- `apply_week_plan` RPC (`20261013095154`) prima `p_assignments` (moves + skips) i primenjuje.
- PlanPage već računa `missedWorkouts` i ima `handleAdapt`.

## Implementacija

1. **Shared `plan-realignment.ts`** (+ testovi): `planRealignment({ workouts, today, longRunDay,
raceDate })`:
   - `skips`: svi PLANNED, non-REST treninzi sa datumom < today (ceo plan, ne samo tekuća
     nedelja) — propušteni.
   - `moves`: za svaku nedelju od tekuće do `raceDate`: isti algoritam kao planWeekAdjustments
     (long na longRunDay, quality razmak, slobodni dani), ali samo za PLANNED buduće treninge
     te nedelje; rezultat agregiran, samo stvarne promene datuma.
   - Reuse internih helpera iz `rebalance-week.ts` (izvuci deljene funkcije umesto duplikata).
2. **UI (PlanPage)**: kad `missed` u poslednjih 14 dana ≥ 3 (novi shared helper
   `recentMissedCount(workouts, today, days=14)`), prikaži karticu „Poravnaj ostatak plana":
   „Propustio si X treninga. Predlog: Y pomeranja u narednim nedeljama." + dugmad
   „Poravnaj" / „Ostavi kako je". Postojeća „Adaptiraj nedelju" ostaje za manje slučajeve
   (ne prikazuj obe istovremeno — realignment kartica ima prioritet).
3. **Apply**: `useApplyWeekPlan` sa agregiranim assignments (jedan RPC poziv); notice
   „Plan je poravnat." + invalidacija (postojeća). Ako nema moves ni skips → „Plan je već
   poravnat."
4. **E2E** `realign.spec.ts`: onboarding → DB manipulacija (isti obrazac kao
   reschedule.spec — direktan REST update postojećih PLANNED treninga na prošle datume, npr. 3
   treninga) → PlanPage prikazuje karticu → „Poravnaj" → propušteni postaju SKIPPED, budući
   PLANNED ostaju unutar svojih nedelja i long run je na longRunDay.
