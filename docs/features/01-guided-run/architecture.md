# F1 — Vođeno trčanje: arhitektura

## 1. `packages/shared/src/guided.ts` (pure TS, bez DOM-a)

Tipovi:

- `TimelineSegment { index, stepIndex, label, repeatIndex?, repeatTotal?, durationSec, distanceKm?,
paceSecPerKm?, paceLabel?, estimated: boolean }`
- `GuidedTimeline { segments, totalDurationSec, totalDistanceKm, estimatedPaces, invalidReason? }`
- `invalidReason: 'NO_STEPS' | 'NOT_A_RUN'`
- `GuidedCueKind = 'START' | 'SEGMENT_START' | 'REPEAT' | 'SEGMENT_END' | 'HALFWAY' | 'FINISH' | 'PAUSE' | 'RESUME'`

API (izvoz kroz `index.ts`):

- `parsePaceLabel('5:25') → 325` (s/km); `null` ako ne parsira.
- `paceForStep(step, paces, zone)`: `step.pace` → parse; inače zona (`workout.paceZone`) → `PlanPaces`
  (E→`easyFastSecPerKm`, M→`marathonSecPerKm`, T→`thresholdSecPerKm`, I→`intervalSecPerKm`,
  R→`repetitionSecPerKm`); inače `DEFAULT_PACE_SEC_PER_KM = 360` uz `estimated: true`.
- `buildStepTimeline(workout, paces): GuidedTimeline` — `durationSec = step.durationSec ??
round(step.distanceKm × paceSecPerKm)`; uzastopni identični labeli → `repeatIndex/repeatTotal`;
  koraci bez distance i bez duration se preskaču; prazni `steps` → `NO_STEPS`; `type` van run allowlist
  (EASY/LONG/TEMPO/INTERVALS/REPETITIONS/RACE) → `NOT_A_RUN`. Jedini izvor trajanja za UI.
- `segmentAt(timeline, elapsedSec)` → `{ segment, offsetSec, remainingSec }` (binarna pretraga).
- `cueTextFor(kind, ctx)` — svi srpski stringovi na jednom mestu (UI + govor + testovi).
- `elapsedAfterSkip(timeline, segmentIndex)` — ciljno vreme za „Dalje"/„Nazad".

Testovi `guided.test.ts` (vitest):

1. EASY 5 km @ 5:25 → 1625 s; `durationSec` se koristi verbatim (tempo korak).
2. INTERVALS 4× „1000 m @ I" → `repeatIndex` 1..4/4, trajanje 1 km × I tempo.
3. Fallback redosled tempa (step.pace → zona → default + `estimated`).
4. `NO_STEPS`, `NOT_A_RUN`; `distanceKm: 0` + `durationSec` OK.
5. `segmentAt` na granicama; `elapsedAfterSkip` kumulativno.

Napomena: F1 koristi `isRunWorkout` iz `app/src/features/plans/progress.ts` (allowlist već izuzima
REST i budući STRENGTH iz F2) — bez izmena postojećih tipova.

## 2. GuidedRunPage + hookovi

- `app/src/pages/GuidedRunPage.tsx` (nov): `useParams` (`:id`), `useSearchParams` (`timeScale`),
  `useWorkout(id)`, `useActivePlan()` (za `paces`), `useRunLogs()` (postojeći log), `useMemo` timeline.
- `app/src/components/guided/useGuidedClock.ts` (nov): monotoni sat.
  - state: `phase: 'idle' | 'countdown' | 'running' | 'paused' | 'finished'`, `elapsedSec`;
  - `start()` u gesture-u: `base = performance.now()`; `elapsed = (now - base) × timeScale − pausedTotal`;
  - `setInterval` 250 ms (samo dok je `document.visibilityState === 'visible'`) + `visibilitychange`
    resync: preračunaj sat i emituj samo najnoviji relevantni cue (propušteni se preskaču);
  - `next()/back()/finishEarly()` pomeraju `base` na `elapsedAfterSkip(...)`; pauza akumulira `pausedTotal`.
- `app/src/components/guided/useSpeechCues.ts` (nov): govor + beep.
  - na start: `new AudioContext()` + sinhroni `resume()` + prazan `speak('')` (iOS unlock);
  - `speak(text)`: utterance, `lang='sr-RS'`, glas po `lang.startsWith('sr')`; nema sr glasa → preskoči govor;
    pre svakog govora `cancel()` (izbegava reprodukciju zaostalih cue-ova pri `timeScale > 1`);
  - `beep(freq, ms)`: OscillatorNode + GainNode; `visibilitychange` → `suspend()`+`resume()` (iOS bug 263627);
  - sve u try/catch, feature-detect; mute iz stanja.
- `app/src/components/guided/useWakeLock.ts` (nov): request na start, re-request na `visibilitychange`,
  `release()` na finish/unmount; no-op ako API ne postoji; neuspeh se ignoriše (uz UI hint).
- `app/src/components/guided/useGeoDistance.ts` (nov, opciono): `watchPosition({ enableHighAccuracy: true })`,
  haversine akumulacija; ignoriše fixove sa `accuracy > 50 m` i skokove < 5 m; pauza zamrzava;
  nikad ne utiče na tempo.
- `app/src/components/guided/{CueBanner,SegmentProgress,GuidedControls}.tsx` (novi): prikazni delovi,
  postojeće ui primitive + Tailwind utilities (BEM samo ako utilities ne mogu).

## 3. `?timeScale=<N>` (test/demo hook)

`Number(searchParams.get('timeScale'))`, clamp `[0.1, 120]`, default 1. Utiče isključivo na
`useGuidedClock` (wall → sim vreme). Cue-ovi se emituju odmah po prelasku granice; E2E dokaz je vizuelni
banner, ne zvuk. Ostaje aktivno u produkciji (nema bezbednosnog rizika).

## 4. Ruta i dugmad

- `router.tsx`: `{ path: '/run/:id', lazy: async () => ({ Component: (await import('@/pages/GuidedRunPage')).GuidedRunPage }) }`
  kao sibling od `/workout/:id` unutar `RequireOnboarding`, van `TabLayout` (pun ekran).
- `TodayPage.tsx` (hero): za `isRunWorkout(todayWorkout) && status === 'PLANNED'` dodati `Link`
  `to={/run/${id}?timeScale=…}` sa secondary `AppButton` „Vođeno" (`data-testid="start-guided"`).
  Postojeći „Detalj treninga" i „Urađeno" netaknuti; novi label ne sadrži „Urađeno" (E2E strict mode).
- `WorkoutPage.tsx`: u red akcija dodati „Vođeno trčanje" (secondary `Link`) pod istim uslovom.
- REST i STRENGTH nikad ne dobijaju dugme; direktan URL → EmptyState „Vođenje nije dostupno".

## 5. E2E plan (`app/e2e/guided.spec.ts`, nov)

1. `register` + `completeOnboarding` → `/today`; klik `start-guided` → URL `/run/**` (sa `timeScale=30`).
2. idle → „Počni" (audio unlock u gesture-u; u headless-u govor je no-op); `guided-cue` sadrži
   „Sledi: {prvi label}"; `guided-elapsed` raste (`waitForFunction`, ne fiksni sleep).
3. „Dalje" ×2 → label i cue se menjaju; „Nazad" → prethodni label.
4. Pauza → `guided-elapsed` miruje 500 ms; „Nastavi" → raste.
5. „Završi" → ConfirmDialog → „Trening završen" + vreme.
6. „Zabeleži trening" → modal; (uz odobrenje) assert prefilovanog trajanja → „Sačuvaj" →
   „Urađeno" na `/today` ili `/workout/:id`.
7. Mute menja `aria-pressed`, banner ostaje.
8. `assertNoHorizontalOverflow` (helper) na idle/running/finishing pri 320 px.
   Test ne zavisi od zvuka; traje < 60 s zahvaljujući `timeScale` + „Dalje".

## 6. Edge cases

- REST/STRENGTH, prazni steps → EmptyState; nema timeline-a.
- `paces === null` (plan bez anchor-a) → fallback 6:00/km + „procena tempa" u UI.
- Korak bez distance i duration → preskočen; korak sa `distanceKm: 0` + `durationSec` → validan segment.
- Ukupno trajanje 0 s → „Počni" disabled.
- Tab hidden > 5 min → na povratku sat tačan; cue-ovi se ne reprodukuju svi.
- Workout već DONE sa log-om → vođenje dozvoljeno, log CTA skriven (bez dupliranog `run_log`).
- Geolokacija odbijena/nedostupna → ostaje planirana distanca + oznaka „GPS nedostupan".
- Nema SpeechSynthesis/WebAudio → tihi režim, sve vizuelno radi.
- Nevalidan/ogroman `timeScale` → clamp; reduced-motion → bez animacija, zvuk normalno.

## 7. Redosled implementacije i verifikacija

1. `guided.ts` + `guided.test.ts` + export → `npm run test`.
2. Hookovi + `GuidedRunPage` + ruta.
3. Dugmad na `TodayPage`/`WorkoutPage`.
4. `guided.spec.ts` → `npm run typecheck && npm run test && npm run lint -w app` + `npx playwright test`.
