# F6 — Arhitektura: `raceday.ts` + `RaceDayPage`

## Shared API (packages/shared/src/raceday.ts, pure TS)

```ts
export type RaceStrategy = 'even' | 'negative';
export interface PaceSplit {
  label: string; // "5–10 km", poslednja "40–42,2 km"
  distanceKm: number; // dužina deonice
  paceSecPerKm: number; // tempo deonice
  segmentSec: number; // vreme deonice
  cumulativeSec: number; // kumulativ od starta
}
export function buildPacePlan(goalTimeSec: number, distanceKm: number, strategy: RaceStrategy): PaceSplit[];
export type ChecklistGroup = 'dan_pre' | 'jutro' | 'staza';
export interface ChecklistItem {
  id: string;
  label: string;
  group: ChecklistGroup;
}
export function raceChecklist(distanceKm: number): ChecklistItem[];
export function raceWeatherNote(assessment: WeatherAssessment): string | null;
```

- Segmentacija: `distanceKm >= 10 ? 5 : 1` km; poslednja deonica je ostatak (HM 1,0975; M 2,195; 10K tačno 2×5).
- Even: `pace = goalTimeSec / distanceKm`; `segmentSec = round(segKm * pace)`; poslednja deonica upija
  zaokruživanje → suma `cumulativeSec` tačno `goalTimeSec`.
- Negative: `multiplier = 1 + 0.02 * (1 − 2 * midProgress)` po deonici; `raw = segKm * pace * multiplier`;
  `scale = goalTimeSec / Σraw`; `segmentSec = round(raw * scale)`; poslednja upija drift. Prva polovina
  sporija ~2% tempa, druga brža ~2%, ukupno vreme očuvano.
- Validacija: non-finite/≤0 → `throw` (kao `predict.ts`).
- Checklist: stabilni `id`-jevi (`bib`, `watch`, `breakfast`, `first-km`, `gel-plan`, `drop-bag`…); M/HM imaju
  `gel-plan` i `drop-bag`, 5K/10K ne; fiksan redosled grupa `dan_pre → jutro → staza`.
- `raceWeatherNote`: switch na `assessment.code` → trkački savet (STORM/RAIN/HEAT/COLD/WIND/AIR); `code: null` → `null`.
- `index.ts`: `export * from './raceday';` (jedna linija).

## Unit testovi (raceday.test.ts, vitest, bez novih dep-ova)

1. Suma `cumulativeSec` == `goalTimeSec` za M/HM/10K/5K × even/negative (poslednji red egzaktno).
2. Broj deonica: 5K 5, 10K 2, HM 5, M 9; poslednja `distanceKm` ≈ ostatak (42,195 − 40).
3. Negative: prva deonica sporija od even, zadnja brža; `segmentSec` svih > 0.
4. Invalid ulazi (0, NaN, negativno, nepoznata strategija) → throw.
5. Checklist: id-jevi unikatni; HM je nadskup 5K po grupama; M sadrži `gel-plan`; redosled stabilan između poziva.
6. `raceWeatherNote`: RAIN/HEAT/COLD/WIND/AIR vraćaju neprazan tekst; `{ code: null, severity: 'info' }` → null.

## RaceDayPage (app/src/pages/RaceDayPage.tsx)

- Hookovi: `useActivePlan()` (races/paces/anchor — keširano), `useWeather()`, `useProfile()` (`run_window`).
- Izvedeno: `distanceKm = plan.races.distance_km`; `goalTimeSec = races.goal_time_sec ??
predictRaceTimes(vdotFromPlan({ paces, anchor }), [distanceKm])[0].timeSec` (samo ako `vdot` postoji).
- Struktura: back header (kao WorkoutPage) → header AppCard (naziv/datum/brojač/cilj + weather note) →
  pacing AppCard (`SegmentedControl` + tabela + nota) → checklist AppCard → tips AppCard.
- Tabela: native `<table>` sa `data-testid="pace-plan"`, redovi `data-testid="split-row"`, brojevi u `num`
  klasi; `overflow-x-auto` na 320px nije potreban ako su kolone kompaktne (4 kratke kolone).
- Checklist hook u istom fajlu: `useRaceChecklist(raceDate, items)` — `useState` init iz localStorage,
  toggle upisuje JSON; `try/catch` oko svih storage poziva.
- Koristiti postojeće primitive: `AppCard`, `AppBadge`, `AppButton`, `SectionHeader`, `SegmentedControl`,
  `Skeleton`, `EmptyState`; bez novih komponenti i bez animacija.

## Integracije (mali diff)

- `router.tsx`: `/race-day` posle `/workout/:id` (RequireOnboarding, van TabLayout).
- `TodayPage.tsx` (chip, redovi 301–342): u grani `daysToRace >= 0` dodati `<Link to="/race-day">Dan trke →</Link>`;
  `data-testid="race-chip"`, „Ciljna trka" i „dana do trke" ostaju nepromenjeni.
- `WorkoutPage.tsx`: kada `workout.type === 'RACE'`, u bloku akcija (~red 212) dodati link „Strategija za dan trke";
  RACE nije guided tip (`GUIDED_RUN_TYPES` bez RACE) → `start-guided` se ne prikazuje, selektori `Koraci`,
  `Urađeno`, `Preskoči` netaknuti.
- Bez izmena `plan-generator.ts`, `queries.ts`, baze i shared tipova.

## E2E (app/e2e/raceday.spec.ts, nov)

- `register` + `completeOnboarding` (cilj 3:45:00, trka +126 dana) → `/today`.
- `getByTestId('race-chip').getByRole('link', { name: /Dan trke/ }).click()` → `**/race-day`.
- Asert: naslov „Dan trke", `getByTestId('pace-plan')` vidljiv, red „5–10 km"; klik na „Negativni split" menja
  prvi split (regex tempo, bez egzaktnih brojeva).
- Checklist: `getByLabel('Prikvači startni broj na majicu').check()` → `page.reload()` → ostaje checked.
- WorkoutPage RACE: `/plan` → `a[aria-label*="TRKA"]` → `**/workout/**` → link „Strategija za dan trke" vidljiv;
  `Koraci` i „Urađeno" i dalje vidljivi (regresija).
- Regresija na `/today`: `today-workout-title`, `race-chip`, `weekly-km` vidljivi. Vremenski mock (`rainFixture()`)
  nije obavezan jer trka +126 dana nema prognozu; note se pokriva unit testom.

## Rizici

- Bez ciljnog vremena (base plan) → pacing kartica sakrivena; ostaju checklista i tips (prihvaćeno).
- `race_date > 7 dana` → nema vremenskog note (horizont prognoze; očekivano ponašanje).
- localStorage u privatnom režimu → checklista radi bez perzistencije (try/catch).
- E2E ne sme da asertuje tačne tempe (zaokruživanje) — koristiti testid i regex.
