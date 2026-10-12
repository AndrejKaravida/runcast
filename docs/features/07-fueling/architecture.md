# F7/R2 — Arhitektura: gorivo i hidratacija

## 1. `packages/shared/src/fueling.ts` (pure TS, bez DOM-a)

Tipovi i API (izvoz kroz `index.ts`):

```ts
export interface FuelingCue {
  atSec: number;
  text: string;
}
export interface FuelingPlan {
  pre: string[];
  during: FuelingCue[];
  post: string[];
}
export interface FuelingInput {
  type: string;
  durationSec: number;
  distanceKm?: number;
  paceSecPerKm?: number;
  apparentC?: number | null;
}
export function buildFuelingPlan(input: FuelingInput): FuelingPlan | null;
```

Pravila:

- `durationSec` ≤ 0 i `distanceKm`/`paceSecPerKm` dati → `durationSec = distanceKm * paceSecPerKm`.
- `durationSec` iz `buildStepTimeline(...).totalDurationSec`; vraća `null` za: tip van
  `LONG | RACE | TEMPO`; `TEMPO` sa trajanjem < 75 min; nema trajanja.
- `pre`: 3 linije — obrok 2–3 h pre (generic, bez sata), snack po trajanju (25/50/75+ g UH),
  ~500 ml vode 2 h pre; za `RACE` dodaje liniju o probi gelova na treningu.
- `during`: gelovi na 40 min pa svakih 35 min dok `atSec <= durationSec - 600`; tekst gela uključuje
  vodu („Gel N — popij ~200 ml vode."); uz `apparentC >= 25` dodaje liniju/hint o elektrolitima i
  gušćem ritmu (~30 min) — bez menjanja `atSec` (jednostavnost + determinizam testova).
- `hydrationForTemp(apparentC)` (interno, testirano indirektno): < 5 → „400–500 ml/h";
  5–15 → „500–600"; 15–25 → „600–700"; > 25 → „700–800 ml/h + elektroliti"; `null` → bez brojeva.
- `post`: protein + UH u roku od 1–2 h + rehidratacija (~1,5 L/kg uz natrijum).
- Svi stringovi srpski, u ovom modulu (jedan izvor; kao `cueTextFor` u `guided.ts`).

Testovi `fueling.test.ts` (vitest): null za EASY i TEMPO 40 min; LONG 100 min → `during` at 2400 s,
4500 s (i ne na 6600 s jer je > duration − 600); RACE 90 min → pre/during/post neprazni; bandovi
temperature (3/10/20/28/null); distance+pace fallback; uvek ≥ 1 `post` linija.

## 2. FuelingCard (`app/src/components/workouts/FuelingCard.tsx`, nov)

- Props: `{ plan: FuelingPlan; apparentC: number | null; runWindow: RunWindow }`; bez fetch-a —
  `WorkoutPage` već ima `useWeather()`, `useProfile()` i `useActivePlan()`.
- `WorkoutPage.tsx` (sekcija): `const timeline = buildStepTimeline({...}, paces)` (isto kao F1),
  `const apparentC = maxApparentInWindow(weather.data?.hours, workout.workout_date, window)` — isti
  filter po `windowStartHour/windowEndHour` kao `assessWorkoutWeather` (weather-rules.ts:50);
  `buildFuelingPlan({ type, durationSec: timeline.totalDurationSec, apparentC })`; render posle
  `WeatherSummaryCard` (WorkoutPage.tsx:199-210).
- Vreme obroka u „Pre" bloku računa sama kartica iz `runWindowHours(runWindow).startHour`
  (jutro → „obrok do 07:00", veče → „do 15:00", fleksibilno → bez sata); shared ostaje bez sati.
- `SectionHeader label="Gorivo"`; tri bloka sa malim labelima „Pre", „Tokom", „Posle"; samo
  `AppCard` + postojeći text stilovi; 320px bez overflow-a.

## 3. GuidedRunPage — merge u postojeći raspored (extend, ne rewrite)

- `GuidedRunPage.tsx`: `const fueling = useMemo(() => (workout && timeline
? buildFuelingPlan({ type: workout.type, durationSec: timeline.totalDurationSec, apparentC: null })
: null), [workout, timeline])` — u guided-u bez weather fetch-a, bez temperaturnih cue-ova.
- Toggle: `const [fuelingOn] = useState(() => localStorage.getItem('runcast.fueling') !== 'off')`
  (`runcast.fueling` po uzoru na `runcast.theme` / `runcast.coach.applied`).
- Novi `useEffect` zavisi od `clock.phase, clock.elapsedSec, fueling, fuelingOn` (isti pattern kao
  postojeći segment/halfway efekti, GuidedRunPage.tsx:117-140): pronađe prvi neodzvonjeni cue sa
  `atSec <= elapsedSec`, upiše `index` u `useRef`, `speech.speak(text)` + `speech.beep(660, 120)`.
  `Set`/index ref sprečava ponavljanje posle „Nazad" (`clock.seekTo`).
- Vizual: `GuidedSessionCard` dobija opcioni prop `fuelingHint?: { fired: boolean; text: string }`;
  renderuje liniju `data-testid="guided-fueling"` ispod `CueBanner`-a. `bannerText` logika i
  `guided-cue` ostaju netaknuti → `guided.spec.ts` prolazi bez izmena.
- Cue se ne emituje u `paused`; `timeScale` poštovan jer koristi `clock.elapsedSec` (sim vreme).

## 4. Settings — sekcija Trening

- `SettingsPage.tsx`, u postojećem `AppCard` sekcije „Trening" (SettingsPage.tsx:253-293), posle
  „Deo dana za trening": label „Podsetnici za gorivo" + `SegmentedControl`
  `Uključeno/Isključeno` (postojeći pattern, bez novog primitive i bez profile polja).
- Upis: `localStorage.setItem('runcast.fueling', value ? 'on' : 'off')`; default ON
  (čita se „!= 'off'"). Bez Supabase izmena.

## 5. E2E plan (`app/e2e/fueling.spec.ts`, nov)

1. `register` + `completeOnboarding`; `page.route('**/v1/forecast**')` sa lokalnim fixture-om
   (apparent 27 °C, bez kiše) → Plan → `a[aria-label*="Dugi trk"]` (poll kroz mesece kao
   guided.spec.ts:12-23) → `/workout/:id`.
2. `Gorivo` vidljivo; tekst sadrži „gel" i „700–800" (vruć pojas); TEMPO strana (ako nađena)
   bez kartice; 320px `assertNoHorizontalOverflow`.
3. Guided: `page.goto('/run/:id?timeScale=120')` → „Počni" → `expect(page.getByTestId(
'guided-fueling')).toContainText('gel', { timeout: 30_000 })` (40 min sim = 20 s wall);
   postojeći `guided.spec.ts` se ne dira.
4. Settings: toggle OFF → `localStorage.getItem('runcast.fueling') === 'off'`; guided start →
   `guided-fueling` nije prisutan.

## 6. Edge cases

- LONG kraći od 75 min (retko) → nema `during` cue-ova, kartica prikazuje pre/posle i „kratko —
  voda je dovoljna"; bez greške.
- `apparentC === null` (nema grada/forecast-a) → bez temperaturnog teksta; kartica i cue rade.
- DONE workout → kartica bez guided linka; guided cue-ova nema za INTERVALS (samo LONG).

## 7. Redosled implementacije

1. `fueling.ts` + `fueling.test.ts` + export → `npm run test`.
2. `FuelingCard` + `WorkoutPage` sekcija.
3. `GuidedRunPage` ref/effect + `GuidedSessionCard` prop; `SettingsPage` toggle.
4. `fueling.spec.ts` → `npm run typecheck && npm run test && npm run lint -w app` i
   `cd app && npx playwright test`.
