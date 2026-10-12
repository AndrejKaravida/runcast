# F4 — Adaptivni trener: arhitektura

## `packages/shared/src/coach.ts` (pure TS, bez DOM/fetch)

```ts
export type InsightTone = 'positive' | 'warning' | 'neutral';
export interface InsightAction {
  kind: 'scale-week';
  weekStart: string;
  factor: number;
}
export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  description: string;
  action?: InsightAction;
}
export interface WeeklyRecap {
  weekStart: string;
  plannedKm: number;
  doneKm: number;
  plannedSessions: number;
  doneSessions: number;
  longestKm: number;
  adherencePct: number;
}
export interface CoachWorkout {
  id: string;
  type: string;
  workout_date: string;
  distance_km: number;
  status: string;
}
export interface CoachLog {
  rpe: number | null;
  log_date: string;
  distance_km: number | null;
}
export interface CoachInput {
  workouts: CoachWorkout[];
  logs: CoachLog[];
  today: string;
  plan: { raceDate: string };
}
export interface CoachResult {
  insights: Insight[];
  recap: WeeklyRecap;
}
export function buildCoachInsights(input: CoachInput): CoachResult;
```

`WorkoutsRow`/`RunLogsRow` zadovoljavaju `CoachWorkout`/`CoachLog` strukturno (nema importa iz app-a). Interne pomoćne f-je: `addDays`, `startOfWeek` (pon), `round1`, `avg`, `isRunType` (EASY/LONG/TEMPO/INTERVALS/REPETITIONS/RACE). Izvoz kroz `index.ts`: `export * from './coach';`.

## Recap (prošla nedelja)

Prozor `[startOfWeek(today) − 7, startOfWeek(today) − 1]`. `plannedKm/doneKm` = suma `distance_km` run treninga / DONE run treninga (round1); `plannedSessions/doneSessions` = broj; `longestKm` = max `distance_km` DONE run treninga (0 ako nema); `adherencePct = round(doneSessions / plannedSessions × 100)`, 0 ako je imenilac 0. STRENGTH/REST se ignorišu.

## Pravila (konstante i tačne definicije)

```
MISSED_DAYS = 14, MISSED_MIN = 2, RPE_WINDOW = 5, RPE_HIGH = 8.5, RPE_DRIFT = 7.5,
RPE_LOW = 6, ADHERENCE_MIN = 90, MIN_RPE_LOGS = 3, MIN_PLANNED = 3,
MIN_KM = 2, FACTOR_MIN = 0.6, FACTOR_MAX = 1.15
```

- `recentRpe`: poslednjih 5 logova sa `rpe != null` i `log_date <= today`, sortirano `log_date` desc (stabilno u odnosu na ulaz koji je već desc), `avg` zaokružen na 1 decimalu.
- R1 `missed-runs`: run trening (ne RACE) sa `status !== 'DONE'` i datumom u `[today − 14, today − 1]` (danas se ne računa), broj ≥ 2 → warning, `action.factor = 0.8`.
- R2 `high-rpe`: `recentRpe.avg >= 8.5` → warning, factor 0.9. R3 `rpe-drift`: `7.5 <= avg < 8.5` i `recentRpe.count >= 3` → neutral, factor 1.0.
- R4 `long-run-missed`: prošla nedelja (kao u recapu) sadrži LONG sa `status !== 'DONE'` → neutral, factor 1.0.
- R5 `ready-to-build`: prozor `[today − 14, today − 1]`, imenilac = run treninzi u prozoru (uključuje SKIPPED/DONE/PLANNED), `planned >= 3`, `adherencePct >= 90`, `recentRpe.count >= 3`, `recentRpe.avg <= 6` → positive, factor 1.1.
- Supresija: R1 gasi R3/R5; R2 gasi R3/R5; R3 gasi R5; R4 nezavisan. Rezultat max 3, redosled R1→R5. Bez insajta → `insights: []`, recap uvek.
- Svaki `factor` ide kroz `clamp(f, FACTOR_MIN, FACTOR_MAX)` pre vraćanja.

## Guardrails i `action.weekStart`

`targetWeek = startOfWeek(today) + 7`. `action` se dodaje samo ako važi: `targetWeek <= plan.raceDate` (nedelja unutar plana), nijedan trening u `[targetWeek, targetWeek+6]` nije `RACE`, i postoji bar jedan skalabilan trening (`status === 'PLANNED'`, `isRunType(type)`, `type !== 'RACE'`) u toj nedelji. Inače insajt ostaje bez akcije. `weekStart` u akciji je uvek `targetWeek` (nedelja posle tekuće, nikad tekuća/prošla).

## `app/src/features/plans/queries.ts` — `useScaleWeek`

```ts
export function useScaleWeek(); // useMutation<{ updated: number }, { weekStart: string; factor: number }>
```

`mutationFn`: `const factor = clamp(input.factor, 0.6, 1.15)`; ako je `factor === 1` → `{ updated: 0 }`. Inače `select('*').eq('user_id', userId).gte('workout_date', weekStart).lte('workout_date', addDaysIso(weekStart, 6))`; filtriraj `status === 'PLANNED' && SCALE_TYPES.includes(type) && workout_date >= todayIso()` (SCALE_TYPES = EASY/LONG/TEMPO/INTERVALS/REPETITIONS, **bez RACE/STRENGTH/REST**). Za svaki (sekvencijalno, `for…of` + `await`): `distance_km = Math.max(2, round1(km * factor))`; `title` = postojeći naslov sa km na kraju zamenjen novim (`/[\d.,]+\s*km$/` → `fmtKm(newKm)`), ostali naslovi netaknuti; `steps` se ne diraju u v1. `update({ distance_km, title }).eq('id', id).eq('user_id', userId)`. Greška → throw (delimičan update je prihvaćen rizik; apply je 1×/nedelju). `onSuccess`: `invalidateQueries(['workouts'])` i `(['workout'])`.

## `CoachInsightsCard.tsx` (novo)

Props: `{ workouts: WorkoutsRow[]; logs: RunLogsRow[]; today: string; raceDate: string }`. `useMemo` → `buildCoachInsights({ workouts, logs, today, plan: { raceDate } })`. Recap redovi + lista insajta (`AppCard`, `AppBadge` za ton; warning→`warning`, positive→`success`, neutral→`neutral`). Akciono dugme: `AppButton size="sm"`, `disabled` dok je `isPending` ili je nedelja primenjena; klik → `scaleWeek.mutateAsync({ weekStart, factor })` → upis u `localStorage['runcast.coach.applied']` (JSON mapa; postojeće parsiranje u try/catch) → lokalni `useState` trigger za re-render; uspeh/tekst greške ispod. Ako nema insajta ni podataka → kartica prikazuje samo recap (bez blokiranja).

## Placement (StatsPage)

Posle `grid` sa 4 pločice, pre `AppCard` „Nedeljni kilometri”: `<CoachInsightsCard workouts={workouts} logs={logs} today={today} raceDate={plan.race_date} />`. F3 prvo menja ovu stranu (redosled F2→F1→F5→F3→F4); spajanje je aditivno. Selektori `Realizacija`, `Poslednje zabeleženo`, `50:00` se ne diraju.

## Testovi

`coach.test.ts` (vitest, fixture helperi `workout()`/`log()`):

1. prazni nizovi → `recap` nule, `insights: []`; STRENGTH/REST ignorisani u recapu.
2. R1: 2× SKIPPED u 14 dana → warning + 0.8; 1× → nema; PLANNED sa budućim datumom ne broji se.
3. R2: avg 8.5/9 → warning 0.9 (uključi zaokruživanje, tie po `log_date`); 4 loga nije R2 jer RPE_WINDOW=5.
4. R3: avg 7.5–8.4 sa ≥3 loga → neutral 1.0; sa 2 loga → ništa.
5. R5: 4/4 DONE + avg 5.5 → positive 1.1; adherence 75% → ništa; bez RPE logova → ništa.
6. R4: LONG prošle nedelje PLANNED/SKIPPED → neutral; DONE → ništa.
7. Guardrails: RACE u ciljnoj nedelji → `action` undefined; `raceDate` pre ciljne nedelje → bez akcije; faktor 1.1 zapisan kao 1.1, a hipotetički 1.3 klampovan na 1.15.
8. Prioritet: R1 + R5 uslovi → samo R1 (+R4 ako je ispunjen), max 3.

E2E `app/e2e/coach.spec.ts` (novo; CONTRACTS §Kvalitet 5): register + `completeOnboarding`; `page.clock.install` na `now + 7 dana` pa navigacija (svi ranije PLANNED treninzi su sada prošli → R1 + R4); `/stats` → insajt vidljiv („Propustio si”), recap; klik „Smanji sledeću nedelju 20%” → potvrda, dugme onemogućeno; `/plan` → `a[aria-label^="<targetMonday>:"]` (uz klik „Sledeći mesec” dok se ne pojavi) menja km u naslovu ≈ ×0.8, tekuća nedelja nepromenjena; `week-row` = 7, unikatni datumi. Fallback ako clock pokvari auth (token refresh): seed propuštenih redova preko Supabase REST sa korisnikovom sesijom (otvoreno pitanje).

## Fajlovi (dozvoljeni)

`packages/shared/src/{coach.ts,coach.test.ts,index.ts}`, `app/src/features/plans/queries.ts`, `app/src/components/workouts/CoachInsightsCard.tsx` (novo), `app/src/pages/StatsPage.tsx`, `app/e2e/coach.spec.ts` (novo). Bez izmena šeme, RPC-ova, `app.spec.ts`.
