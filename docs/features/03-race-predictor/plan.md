# F3 — Prediktor trke + lični rekordi: plan

## Obim

- `PredictorCard` na Stats: 4 predviđena vremena (5K/10K/HM/M) iz `plan.paces` → VDOT, fallback `plan.anchor`.
- `PersonalBestsCard` na Stats: PB iz `run_logs` (±2% tolerancija, 4 standardne distance).
- Onboarding (korak 1): hint „realno/ambiciozno" kada postoje i ciljno vreme i poslednji rezultat.
- Bez izmena šeme i `vdot.ts`; bez novih zavisnosti; samo srpski stringovi u UI.

## PredictorCard (Stats)

- Props: `{ paces: PlanPaces | null; anchor: PlanAnchor | null }` iz `useActivePlan` (cast iz Json).
- Redovi, uvek sva 4 i istim redom: „5 km", „10 km", „Polumaraton", „Maraton"; vrednost
  `formatDuration(timeSec)`, desno `formatPace(timeSec / distanceKm)` + „/km".
- Naslov „Predikcija trke"; jedan pasus note ispod (`text-[11px] text-text-muted`).
- Ako trka iz plana (`plan.races.distance_km`) padne na standardnu distancu → badge „Tvoja trka"
  na tom redu; bez poklapanja nema badge-a.
- Bez anchor/paces (bazni plan): kartica bez redova + „Dodaj poslednju trku ili ciljno vreme da dobiješ predikciju."

## PersonalBestsCard (Stats)

- Props: `{ logs: RunLogsRow[] }` — strukturno kompatibilno sa `PersonalBestLog[]` iz shared.
- Redovi: 5 km / 10 km / Polumaraton / Maraton; vrednost vreme + datum (`formatDateShort`); bez PB-a „—".
- Naslov „Lični rekordi"; nota: „Automatski iz zabeleženih treninga (±2% tolerancije)."
- Nijedan PB: tekst „Još nema ličnih rekorda — zabeleži trening na standardnoj distanci."

## Onboarding feasibility hint (korak 1, postojeći preview blok)

- Prikaz samo ako su validni poslednja trka (distanca + vreme) I ciljno vreme; iznad postojeće
  VDOT linije dodaje se jedan pasus.
- `predicted = predictRaceTimes(vdotFromPerformance(recent), [goalDistanceKm])[0]`;
  `delta = (goalSec − predicted.timeSec) / predicted.timeSec`; goal brži >3% → „ambiciozan",
  inače (uključujući sporiji cilj) → „realan".
- Bez poslednjeg rezultata hint se ne renderuje (cilj kao sopstvena referenca je uvek „realan").
- `VDOT 4…` preview ostaje netaknut (postojeći E2E ga čita).

## Srpski copy (finalni stringovi)

- „Predikcija trke", „5 km", „10 km", „Polumaraton", „Maraton", „Tvoja trka", „—"
- „Procena po Daniels VDOT modelu — greška raste sa razlikom distanci (±2–4%)."
- „Bazirano na ciljnom tempu — odražava cilj, ne garantuje trenutnu formu."
- „Bazirano na rezultatu: {distanca} {vreme}."
- „Dodaj poslednju trku ili ciljno vreme da dobiješ predikciju."
- „Lični rekordi", „Automatski iz zabeleženih treninga (±2% tolerancije)."
- „Još nema ličnih rekorda — zabeleži trening na standardnoj distanci."
- „Cilj je realan za tvoju trenutnu formu (predviđeno {vreme})."
- „Cilj je ambiciozan za trenutnu formu (predviđeno {vreme})."

## Acceptance criteria

1. Stats sa anchor-om (race ili goal) prikazuje sva 4 vremena, strogo rastuća sa distancom.
2. Stats sa baznim planom prikazuje poruku umesto redova, bez pada stranice.
3. Log 5,0 km / 25:00 → red „5 km" = „25:00" + datum; brži log zamenjuje PB; 5,3 km se ignoriše.
4. Onboarding: cilj 3:40 + poslednjih 10K 50:00 → „ambiciozan" (razlika ~4,2%); cilj 3:45 + isti
   rezultat → „realan" (razlika ~2,0%); bez poslednjeg rezultata hint se ne prikazuje.
5. `Realizacija`, `Poslednje zabeleženo`, `50:00` (Stats) i `VDOT 4…` (onboarding) i dalje vidljivi.
6. `npm run test` zelen (novi `predict.test.ts`); `npm run typecheck` i `npm run lint -w app` bez
   novih grešaka; bez komentara u kodu.
7. Bez horizontalnog overflow-a na 320px (redovi flex, ne grid od 4 kolone u jednom redu).

## E2E dodatak

- Novi `app/e2e/predictor.spec.ts`: register → onboarding sa ciljem 3:40 i poslednjim 10K 50:00
  (očekuj „ambiciozan" hint) → dovrši wizard → /today „Urađeno" → Distanca 5, Trajanje 25:00 →
  Sačuvaj → /stats → očekuj „Predikcija trke", „Lični rekordi", red „5 km" sa „25:00".
- Postojeći `app.spec.ts` i `responsive.spec.ts` se ne diraju.

## Van obima

- Učenje predikcije iz logova i confidence skor (F4), ručna izmena ciljnog vremena, GPS segment
  best-efforts, dodatne distance (1 km, 1 milja), migracije/tabele, promene `vdot.ts`.

## Otvorena pitanja / rizici

- CONTRACTS tabela vlasništva ne pominje F3 e2e fajl — predlog: dozvoliti `app/e2e/predictor.spec.ts`
  (pravilo 5 iz „Kvalitet" dozvoljava nove fajlove `app/e2e/<feature>.spec.ts`).
- PB vidi samo poslednjih 300 logova (`useRunLogs` limit) — prihvaćeno za v1.
- `races.distance_km` može biti nestandardna (npr. 30 km) → badge „Tvoja trka" se izostavlja.
