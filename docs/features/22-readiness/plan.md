# F22 — Readiness (san + HRV/RHR iz Health)

Cilj: ujutru na Danas prikazati **spremnost** na osnovu sinoćnjeg sna i jutrošnjeg pulsa
(HRV/RHR gde postoje), sa diskretnim predlogom (npr. „HRV ti je ispod proseka, razmisli o
lakšem tempu danas") — opt-in, nikad tiho prepisivanje plana.

## Trenutno stanje

- Health adapter (`app/src/features/health/adapter.ts`) čita samo `workouts` (`queryWorkouts`).
- Plugin podržava: `readSamples` za `sleep` (sa fazama), `restingHeartRate`,
  `heartRateVariability` (`node_modules/@capgo/capacitor-health` definitions).
- Native: Android manifest ima samo READ_EXERCISE + READ_HEALTH_DATA_HISTORY; iOS plist ima
  samo health share/update strings.

## Implementacija

1. **Adapter**: `fetchReadiness(sinceIso)` → `{ sleepHours: number | null, restingHr: number |
null, hrv: number | null, source: 'healthkit' | 'healthconnect' }` preko `readSamples`
   (sleep: sum `asleep`/stages duration za prošlu noć; RHR: najnoviji sample; HRV: najnoviji
   RMSSD). Web stub → null. Mock preko `window.__runcastHealthMock.readiness` za E2E.
2. **Shared `readiness.ts`** (+ testovi): `computeReadiness({ sleepHours, restingHr, hrv,
baseline: { rhrAvg, hrvAvg } }, )` → `{ score 0-100, level: 'fresh' | 'normal' | 'tired',
hints: LocalizedText[] }`; pravila: san < 6h → tired; HRV > 10% ispod proseka → hint;
   RHR > 7 bpm iznad proseka → hint. Bez baseline (prvih 14 dana) → samo san utiče.
   Baseline: prosečne vrednosti iz lokalno keširanih uzoraka (`runcast.readiness.history`,
   localStorage, max 28 dana).
3. **UI**: `components/today/ReadinessCard.tsx` na Danas (posle WeatherHero, pre RaceChip):
   badge nivoa (Svež/Normalan/Umoran), san u satima, HRV/RHR kad postoje, 1-2 hint linije;
   skeleton dok se učitava; sakriven na webu bez podataka i kad nema integracije. Settings →
   Zdravlje: toggle „Readiness uvoz" (localStorage `runcast.readiness.autosync`, default off) +
   proširen consent tekst (san/HRV podaci, lokalna obrada, samo prikaz).
4. **Native**: Android manifest dodati `android.permission.health.READ_SLEEP`,
   `READ_RESTING_HEART_RATE`, `READ_HEART_RATE_VARIABILITY`; iOS plist ne menja se (postojeći
   NSHealthShareUsageDescription pokriva). Verifikovati oba builda.
5. **Politika privatnosti**: dopuniti sekciju o zdravstvenim podacima (san/HRV se čitaju samo
   uz uključen toggle, obrađuju lokalno, ne izlaze iz uređaja) — `legal.json` sr/en.
6. **E2E** `readiness.spec.ts`: mock readiness podataka → Danas prikazuje karticu sa nivoom;
   loš san → „Umoran" + hint; bez mocka (web) → kartica skrivena; settings toggle radi.

## Van v1

Readiness iz istorije treninga (load), automatsko prilagođavanje plana po readiness-u, push
ujutru sa readiness sažetkom.
