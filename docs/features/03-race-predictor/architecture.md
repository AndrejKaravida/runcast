# F3 — Prediktor trke + lični rekordi: arhitektura

## `packages/shared/src/predict.ts` (pure TS, bez DOM/fetch, izvoz iz `index.ts`)

```ts
export const STANDARD_RACE_KM = [5, 10, 21.0975, 42.195] as const;
export interface RacePrediction {
  distanceKm: number;
  timeSec: number;
  paceSecPerKm: number;
}
export function predictRaceTimes(vdot: number, distancesKm: readonly number[] = STANDARD_RACE_KM): RacePrediction[];
export function riegelEquivalent(timeSec: number, fromKm: number, toKm: number): number;
export interface PersonalBestLog {
  id: string;
  log_date: string;
  distance_km: number | null;
  duration_sec: number | null;
}
export interface PersonalBest {
  distanceKm: number;
  timeSec: number;
  logDate: string;
  logId: string;
}
export function detectPersonalBests(
  logs: readonly PersonalBestLog[],
  distancesKm: readonly number[] = STANDARD_RACE_KM,
): PersonalBest[];
export function vdotFromAnchor(anchor: PlanAnchor): number;
export function vdotFromMarathonPace(marathonSecPerKm: number): number;
export function vdotFromPlan(input: { paces: PlanPaces | null; anchor: PlanAnchor | null }): number | null;
```

## predictRaceTimes — bisection na `vdotFromPerformance`

- Za svaku distancu `d` traži se `t` sa `f(t) = vdotFromPerformance(d, t) = vdot`; `f` je strogo
  opadajuća u `t` za fiksno `d` (provereno numerički).
- Granice: `lo = 1800 × d / 42.195`, `hi = 28800 × d / 42.195` (za maraton doslovno [0,5 h, 8 h]).
  Skaliranje je obavezno: neskalirane [1800, 28800] klipuju 5K za VDOT ≳ 31 (izmereno: VDOT 40 →
  30:00 umesto 24:06). Pokrivenost: `f(lo) ≈ 404–492`, `f(hi) ≈ 13.7–15.3`, a `pacesFromVdot`
  klampuje VDOT na [20, 90] → koren je uvek unutar granica; nema ekspanzije opsega.
- Petlja: `while (hi − lo > 1) { mid; f(mid) > vdot ? lo = mid : hi = mid }` (≤12 iteracija);
  `timeSec = Math.round((lo + hi) / 2)`, `paceSecPerKm = Math.round(timeSec / d)`.
- Greška: `throw new Error('vdot must be finite')` za nevalidan ulaz (stil `pacesFromVdot`).
- Verifikovano: round-trip `predict(d, vdotFromPerformance(d, t)) = t` tačno (±1 s) za sve standardne
  distance; VDOT 50 → 19:56 / 41:20 / 1:31:32 / 3:10:40 (poklapa se sa tabelama).

## riegelEquivalent

- `t2 = timeSec × (toKm / fromKm) ** 1.06`; identitet za `toKm === fromKm`; greška za nepozitivne ulaze.
- Sekundarna utilita: cross-check u testovima (VDOT i Riegel predikcije susednih distanci unutar ~10%).
  Nema UI potrošača u v1 — odobreno od orkestratora.

## detectPersonalBests

- Prozor po distanci: `[d × 0.98, d × 1.02]`; kandidat ako su `distance_km` i `duration_sec` konačni,
  pozitivni i u prozoru; `distance_km < 3` se preskače (odbrambeno — 5K prozor počinje na 4.9).
- Pobednik: najmanji `duration_sec`; izjednačenje → noviji `log_date`; pa veći `id` (determinističan
  poredak nezavisan od reda iz upita). Jedan zapis po distanci, u redu standardnih distanci.
- Aproksimacija: ceo log se pripisuje distanci (bez GPS segmenata) — 5.05 km / 25:30 je 5K PB, 5.2 km nije.

## VDOT iz plana (`vdotFromPlan`) — prioritet i opravdanje

- Redosled: `paces.marathonSecPerKm` → `vdotFromMarathonPace` (inverzija), pa `anchor` →
  `vdotFromAnchor` (`vdotFromPerformance(anchor.distanceKm, anchor.timeSec)`), inače `null`.
- Inverzija je zvučna kao „VDOT koji implicira M tempo plana": predviđeni maraton = M pace × 42.195
  (±1 s) — kartica je konzistentna sa M tempom u treningu i konzervativna (Runna princip).
- Izmereni bias: vraćeni VDOT je niži od anchor VDOT — 20: −0.1%, 40: −1.3%, 50: −2.1%, 60: −2.8%,
  70: −3.5%, 90: −4.6% (monotono). Uzrok: `pacesFromVdot` drži M na fiksno 80% VO2max, Danielsova
  kriva na maratonskom trajanju daje ~81–82%. Anchor-first alternativa odbačena: predikcija bi bila
  ~2% brža od M tempa prikazanog u planu; fallback na anchor i dalje čuva tačnost.
- Bazni plan: `anchor === null` → `paces === null` → `vdotFromPlan` vraća `null` (`plan-generator.ts:391`).

## Komponente (props, bez novih hook-ova)

```ts
interface PredictorCardProps {
  paces: PlanPaces | null;
  anchor: PlanAnchor | null;
  raceDistanceKm: number | null;
}
interface PersonalBestsCardProps {
  logs: PersonalBestLog[];
}
```

- `PredictorCard` interno: `vdot = vdotFromPlan({ paces, anchor })`; `null` → poruka; inače
  `predictRaceTimes(vdot)` + nota (goal/race provenance po `anchor.kind`), badge „Tvoja trka" kada se
  `raceDistanceKm` poklopi sa standardnom distancom uz toleranciju 0.01 km — baza je `numeric(4,2)`
  pa 42.195 čuva kao 42.20, a 21.0975 kao 21.10.
- `RunLogsRow` je strukturni superset `PersonalBestLog` — prosleđuje se direktno. Primitivi:
  `AppCard`, `AppBadge`, `formatDuration`, `formatPace`, `formatDateShort`; bez `useTapProps`.

## StatsPage — raspored

- Posle tiles grida, pre „Nedeljni kilometri": `<PredictorCard />` pa `<PersonalBestsCard />`.
- `plan.paces`/`plan.anchor` se cast-uju iz `Json` (`as unknown as PlanPaces | null`); `raceDistanceKm`
  iz `plan.races?.distance_km ?? null`. Nema novih upita (logovi su već učitani kroz `useRunLogs`).

## OnboardingPage — hint

- U `preview` memo bloku (korak 1) `feasibility` se računa samo ako postoje `recentTimeSec` i
  `goalTimeSec`; render ispod VDOT pasusa unutar postojećeg primary-soft bloka. Validacije i
  `willUseBasePlan` se ne menjaju; `VDOT {preview.vdot}` string ostaje (E2E ga čita).

## Unit testovi (`predict.test.ts`, vitest, `npm run test`)

1. Round-trip: za svaku standardnu distancu i 3–4 reprezentativna vremena, predikcija tačna na ±1 s.
2. Referentna tabela: VDOT 40/50 → objavljena vremena ±5 s; monotonija po distanci (5K < 10K < HM < M).
3. Monotonija po VDOT: `predictRaceTimes(50)` strogo brži od `predictRaceTimes(45)` na svakoj distanci.
4. Riegel: identitet, 5K→10K ≈ ×2.0855, nepozitivni ulazi bacaju grešku.
5. PB: unutar/izvan prozora; najbrži pobeđuje; izjednačenje → noviji datum; `null` polja se preskaču;
   log <3 km se preskače; jedan log → najviše jedan PB; prazan ulaz → `[]`.
6. `vdotFromPlan`: prioritet paces, fallback anchor, `null` za bazni plan; bias inverzije <3% za VDOT 30–60.

## E2E (`app/e2e/predictor.spec.ts`, nov fajl — odobren)

- Tok: onboarding sa ciljem 3:40 i poslednjim 10K 50:00 (očekuj „Cilj je ambiciozan"), log 5 km /
  25:00 na /today, pa /stats: „Predikcija trke", „Tvoja trka", „Lični rekordi", red „5 km" = „25:00".
- Ne diraju se `app.spec.ts`, `responsive.spec.ts`, `helpers.ts`.

## Kvalitet i rizici

- Posle implementacije: `npm run typecheck`, `npm run test`, `npm run lint -w app`,
  `cd app && npx playwright test`.
- Rizik: cast `Json` bez runtime validacije (samo RPC piše polja); PB nad poslednjih 300 logova;
  deterministički tie-break po `id` (uuid) je proizvoljan, ali stabilan.
- Ne dirati: `vdot.ts`, `plan-generator.ts`, bazu, postojeće E2E fajlove.
