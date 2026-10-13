# F18 — Export treninga za sat (TCX)

Cilj: svaki trening može da se izveze kao **TCX fajl sa strukturiranim koracima** (zagrevanje,
intervali, hlađenje + pace targeti) i uveze u Garmin Connect / COROS / Polar / Strava.

## Trenutno stanje

- `WorkoutStep` (`packages/shared/src/types.ts:24`): `{ label, distanceKm?, durationSec?, pace? }`
  gde je `pace` string oblika `M:SS` po km. `workouts.steps` je JSONB.
- Postoji `.ics` izvoz plana (`features/plans/export.ts`, `shared/ics.ts`) kao obrazac za
  download + `lib/download.ts`.
- Nema TCX/FIT izvoza; Apple WorkoutKit (native) van v1.

## Implementacija

1. **Shared `tcx.ts`** (+ unit testovi): `buildWorkoutTcx({ workout, paces })` → TCX 2.0 XML:
   `TrainingCenterDatabase > Activities > Activity Sport="Running"` sa jednim `Lap` po koraku
   (Order, `TotalTimeSeconds` ili `DistanceMeters`, `Intensity` Active/Rest, `Target` tipa
   `Speed` sa `SpeedZone` min/max u m/s iz `pace` stringa; fallback bez Target-a ako pace nema).
   Zagrevanje/hlađenje iz `steps`, repeat koraci se ekspandiraju u sekvencijalne lapove.
   Bez GPS track pointa (planirani trening). XML escape za labele. Deterministicki izlaz.
2. **App `features/plans/export-tcx.ts`**: `useExportWorkoutTcx()` mutacija — sastavi TCX iz
   workout-a + `planPaces(plan)`, download kao `<datum>-<slug-naslova>.tcx` preko `lib/download.ts`.
3. **UI**: `WorkoutPage` dobija sekundarnu akciju „Izvezi za sat (.tcx)" (ikona Watch/Download)
   pored postojećih akcija; i `GuidedRunPage` overview (pre starta) istu akciju. i18n ključevi u
   `workout.json`/`guided.json` (sr/en).
4. **E2E** `tcx.spec.ts`: onboarding → otvori današnji trening → klik izvoza → `waitForEvent
('download')` → parsiraj preuzeti sadržaj: sadrži `<Activity Sport="Running"`, broj `<Lap`
   jednak broju koraka (ili više za intervale), `<Target` sa `SpeedZone` kad korak ima pace.
5. Napomena u `docs/NATIVE.md` ili doc-u: Garmin Connect import (TCX activity), Coros/Polar
   podrška; FIT/WorkoutKit u sledećoj fazi.

## Van v1

Bulk izvoz celog plana (više fajlova/zip), FIT binarni format, Apple WorkoutKit, Garmin
Connect IQ structured workouts API.
