# F2 — Snaga & mobilnost u planu: plan

## Obim

Generisani plan dobija strength treninge na **isključivo REST danima** (fiksno uključeno, bez korisničkih preferencija). Tip `STRENGTH`: `distanceKm 0`, `durationSec > 0` (20–35 min), `paceZone null`, `steps = [{ label, durationSec }]` u srpskom. Trčanja ostaju na identičnim danima kao danas. Bez novih dependency-ja, bez videa, bez opreme.

## Kriterijumi prihvatanja (testabilno)

1. `generatePlan` (daysPerWeek 4, longRunDay 0, anchor, experienced): u BASE nedeljama STRENGTH je sre+pet; u BUILD/PEAK uto+sub; nedelja ostaje REST; trčanja (tipovi i datumi) identična postojećem generatoru — dokazuje se testom nad setom run workout-a pre/posle.
2. Svaka STRENGTH stavka: `type === 'STRENGTH'`, `distanceKm === 0`, `20*60 <= durationSec <= 35*60`, `paceZone === null`, `steps.length > 0`, svaki step ima `label` i `durationSec > 0`, `label` sadrži `NxN` ili `min`.
3. Race week: 0 STRENGTH stavki (uključujući dan trke i prethodni dan).
4. TAPER: najviše 1 STRENGTH (mobilnost) i samo kad je do trke ≥ 10 dana; inače 0.
5. Nijedan STRENGTH nije na dan pre long run-a ni na danu trčanja (garantovano izborom iz REST dana minus `longRunDay - 1`).
6. Nijedna STRENGTH nedelja ne prelazi broj slobodnih REST dana; dPW 6 može dati 0 u nekim nedeljama (prihvaćeno).
7. `experience: 'first'` → nijedan step nije plyo (label ne sadrži „Poskoci”/„Skokovi”).
8. `npm run typecheck`, `npm run test`, `npm run lint -w app` zeleni; `cd app && npx playwright test` prolazi bez izmena `app/e2e/app.spec.ts` sem ako se pokaže nužna (dozvoljeno samo postojeći testovi); responsive na 320px bez horizontalnog overflow-a.
9. Today/Workout za STRENGTH: dugme „Završi trening” markira DONE bez `run_log` unosa; Preskoči i dalje radi; kišni banner se ne prikazuje za STRENGTH.

## UX po ekranu

- **PlanPage**: nova boja tačke za STRENGTH (warning) + legenda „Snaga”; `WeekRow` prikazuje „Snaga” umesto sirovog `STRENGTH`; aria-label ostaje `${date}: ${title}` (dugi trk linkovi netaknuti); bez novih redova u „Ova nedelja” listi (strength zamenjuje REST — 7 `week-row` ostaje).
- **TodayPage**: hero prikazuje naslov treninga, oznaku „Snaga”, trajanje i do 3 koraka sa trajanjem; nema `PaceZoneBadge`, nema vremenske prognoze/kišnog bannera za STRENGTH; dugme „Završi trening” odmah markira DONE (bez modala); „Detalj treninga” vodi na `/workout/:id`. Nedeljni ring i „Niz trčanja” i dalje broje samo trčanja.
- **WorkoutPage**: badgevi „Snaga” + „Faza: X” + trajanje (`formatDuration`); lista koraka sa trajanjem (bez „/km”); sakriven WeatherSummaryCard; dugmad „Završi trening” (DONE) i „Preskoči” (postojeći ConfirmDialog + `useSkipWorkout`); bez RPE/distance forme.
- **Logovanje**: STRENGTH nikad ne otvara `LogWorkoutModal`; DONE update ide direktno na `workouts.status` + invalidacija `['workouts']`/`['workout']`.

## Srpski copy

- Tip: `Snaga`
- Naslovi sesija: `Snaga A — noge i core`, `Snaga B — glute i core`, `Snaga — održavanje`, `Mobilnost 20 min`
- Dugmad: `Završi trening`, `Preskoči`, `Nazad`
- Koraci (primeri): `Zagrevanje — 5 min`, `Čučnjevi — 3×12`, `Bugarski čučanj — 3×10 (svaka noga)`, `Glute most — 3×12`, `Mrtvo dizanje na jednoj nozi — 3×10`, `Iskorak — 3×10 (svaka noga)`, `Podizanje na prste — 3×15`, `Plank — 3×45 s`, `Dead bug — 3×10`, `Bird dog — 3×10`, `Poskoci — 3×10`, `Hlađenje i mobilnost — 5 min`, `Disanje i opuštanje — 3 min`
- Legenda na PlanPage: `Snaga`
- Napomena: brojevi bez razmaka u `NxN` obliku, crtica je `—` (em dash), decimalni zarez samo u km naslovima (postojeće).

## Van obima

- Korisnički toggle/frekvencija/dužina/oprema; `PlanConfig` bez novih polja.
- Video/animacije vježbi, guided strength player, tajmer po koraku.
- Upper-body/all-round varijante, težine, progresija u kg.
- Stats/reports/finansije, kalendarski drag&drop, zamjena (swap) i pomeranje STRENGTH.
- Izmene `weather-rules.ts`, `progress.ts`, `utils.ts` i drugih fajlova van F2 liste; playoff logika (F1) i „Zašto ovaj trening” (F5).
