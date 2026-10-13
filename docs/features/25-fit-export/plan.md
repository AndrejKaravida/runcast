# F25 — FIT export (pravi strukturirani workout za Garmin)

Cilj: pored TCX-a, izvoz **FIT workout fajla** — format koji Garmin satovi uvoze kao
strukturirani trening (koraci + pace targeti), bez zavisnosti (encoder u čistom TS-u).

## Implementacija

1. **Shared `packages/shared/src/fit.ts`** (+ testovi): minimalni FIT encoder:
   - Header (12 B): size, protocol 0x10, profile version, data size, ".FIT", CRC.
   - Poruke: `FileId` (0, type=5 workout, manufacturer=255 development, time_created u FIT
     epohi 1989-12-31), `Workout` (26: sport=1 running, num_valid_steps, wkt_name), po jedan
     `WorkoutStep` (27: message_index, duration_type 0=time (ms) / 1=distance (cm),
     duration_value, target_type 0=speed sa custom_target_value_low/high u mm/s iz pace
     stringa, fallback target_type 2=open; intensity active/rest/warmup/cooldown iz labela).
   - CRC-16 (FIT algoritam) nad headerom i podacima; deterministički izlaz.
   - Testovi: roundtrip sa minimalnim reader-om u testu (definicije + data poruke se parsiraju
     nazad), CRC validan, broj koraka, mm/s matematika (5:00/km → 3333 mm/s), escape/dužina
     imena, workout bez koraka → 1 step.
2. **App `features/plans/export-fit.ts`**: `useExportWorkoutFit()` — mirror TCX izvoza
   (`export-tcx.ts`), download `<datum>-<slug>.fit`.
3. **UI**: `WorkoutPage` + `GuidedRunPage` overview: dugme „Garmin (.fit)" pored postojećeg
   TCX dugmeta (akcioni red je već flex-wrap zbog 320px); i18n `workout.json`/`guided.json`
   (`exportFit`).
4. **E2E** `fit.spec.ts`: download → binarna provera: header size + „.FIT" na offsetu 8 +
   preračunat CRC jednak zapisanom + data size > 0.
5. Napomena u doc-u: Garmin kopiranje (GARMIN/NewFiles preko USB-a ili Garmin Connect import);
   Apple WorkoutKit ostaje van v1.

## Van v1

FIT course (ruta), FIT workout sa HR zonama, potpisivanje/proizvođački ID, Watch app.
