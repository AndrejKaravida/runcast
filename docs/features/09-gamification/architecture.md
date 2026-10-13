# F9 (R3) — Arhitektura: `achievements.ts` + grid/toast

## Shared `packages/shared/src/achievements.ts` (pure TS, bez DOM/fetch)

```ts
export interface AchievementWorkout {
  id: string;
  workout_date: string;
  type: WorkoutType;
  status: WorkoutStatus;
  distance_km: number;
}
export interface AchievementLog {
  workout_id: string | null;
  log_date: string;
  distance_km: number | null;
}
export interface AchievementProfile {
  experience: string | null;
  volume_band: string | null;
}
export interface Achievement {
  id: string; // 'sessions.5' | 'km.1000' | 'streakWeeks.8' | ...
  family: string; // first | sessions | streakWeeks | long | tempo | km | race | strength | pb
  tier: 1 | 2 | 3 | 4; // vizuel: 1 neutral → 4 success
  title: string;
  description: string;
  unlockedAt: string | null;
  progress: { current: number; target: number };
}
export interface WeeklyChallenge {
  weekStart: string;
  done: number;
  target: number;
  longPlanned: boolean;
  longDone: boolean;
  complete: boolean;
  sessionsText: string; // '2/4 treninga'
  longText: string | null; // 'dugi trk ✓' / 'dugi trk'
}
export function computeAchievements(input: {
  workouts: readonly AchievementWorkout[];
  logs: readonly AchievementLog[];
  profile: AchievementProfile | null;
  today: string;
}): Achievement[];
export function weeklyChallenge(
  plan: { start_date: string; race_date: string },
  workouts: readonly AchievementWorkout[],
  today: string,
): WeeklyChallenge | null;
```

- `index.ts` dobija `export * from './achievements';` (jedna linija).
- Privatni `addDays`/`startOfWeek` kao u `coach.ts` — moduli nezavisni, bez novog izvoza (dve
  kratke funkcije se dupliraju).
- Lokalna konstanta run tipova **uključuje `RACE`** (razlika od `coach.ts`/`weather-rules.ts`
  gde je RACE izuzet): trka je završen trening. `REST`/`STRENGTH` se filtriraju po potrebi.
- `doneRuns` = `status === 'DONE' && workout_date <= today && RUN_TYPES.includes(type)`.
- `effectiveKm(workout, logsByWorkoutId)` = max `distance_km` logova vezanih za workout, inače
  `workout.distance_km` (samo za `long` familiju).
- `sessions`/`strength`: hronološki N-ti DONE. `km`: sortirani logovi (`log_date <= today`)
  kumulativno, `unlockedAt` = datum prelaska praga.
- `streakWeeks`: od tekuće nedelje unazad; tekuća ulazi ako ima DONE run; prekid na prvoj punoj
  nedelji bez DONE runa; `unlockedAt` = datum prvog DONE runa u prag-nedelji.
- `pb`: za svaku `STANDARD_RACE_KM` distancu (±2% kao `detectPersonalBests`) sortiraj logove po
  datumu; prvi log posle kojeg kasniji log obori dotadašnji best je prelaz; `unlockedAt` = datum
  tog kasnijeg loga (`detectPersonalBests` vraća samo finalni best, ne istoriju prelazaka).
- `weeklyChallenge`: nedelja pon–ned; `target` = broj run treninga te nedelje; `done` = DONE;
  `longPlanned`/`longDone` po tipu `LONG`; `complete = target > 0 && done >= target`.
- `profile` ulazi u potpis (brief) ali v1 pravila ga ne čitaju — bez skrivene upotrebe.

## App komponente (nove)

- `app/src/components/achievements/BadgeTile.tsx`: `AppCard` + ikona (lucide: `Award`, `Flame`,
  `Mountain`, `Zap`, `Route`, `Flag`, `Dumbbell`, `TrendingUp`, `Trophy`) + naslov + osvojeni
  čipovi (`AppBadge` po tier-u) ili progres bar + „još X do {prag}"; `data-state="earned|locked"`.
- `app/src/components/achievements/AchievementsGrid.tsx`: grupiše `Achievement[]` po `family`
  (9 tile-ova — bez zida zaključanih), prazno stanje `Prvi bedž je najslađi — samo zabeleži
trening.`; grid 2 kolone (1 na 320px).
- `app/src/components/achievements/AchievementToast.tsx`: `role="status"`, `aria-live="polite"`,
  motion slide/fade 200–250 ms sa `useReducedMotion()` gate-om (kao `useTapProps`), auto-dismiss
  ~5 s + dismiss; `data-testid="achievement-toast"`; kontejner `pointer-events-none` da ne
  blokira klikove.
- `app/src/features/achievements/seen.ts`: `useAchievementCelebration(workouts, logs, profile)` —
  računa `computeAchievements`, čita `runcast.achievements.seen`; prvi mount markira
  `unlockedAt < today`; emituje najviši danas otključan ne-`seen` nivo i markira tekuće kao
  viđene; vraća `{ achievement, dismiss }`.

## Integracije (bez izmena šeme/queries)

- `StatsPage.tsx`: `<AchievementsGrid achievements={...} />` posle `PersonalBestsCard`; podaci (`workouts`, `logs`) su već tu — `useMemo` pored postojećih.
- `TodayPage.tsx`: tihi red u `week-board`: `Nedeljni izazov · {sessionsText}` (+ long chip);
  `useAchievementCelebration` + `<AchievementToast>` — posle logovanja `workouts` refetch sadrži
  novi DONE → toast. `WorkoutPage.tsx`: isti hook + toast (logovanje sa detalja); GuidedRunPage
  pokriven preko ciljne strane posle navigacije.
- Bez novih ruta/query hookova — sve iz keša (`useWorkoutsRange`, `useRunLogs`, `useProfile`).

## Unit testovi (`packages/shared/src/achievements.test.ts`, vitest)

1. `first`/`sessions`: 0, 4, 5, 50 treninga; `unlockedAt` = datum N-tog; budući datumi ignorisani;
   `profile` null/popunjen → identičan rezultat (v1 ga ne čita).
2. `streakWeeks`: 3 uzastopne nedelje → nema; 4 → jeste; prazna nedelja prekida; tekuća ulazi.
3. `long`: planirano 8 km, log 12 km → `long.10` na datum loga; bez loga koristi planiranu km.
4. `km`: preko 100 na trećem logu → `km.100.unlockedAt` = taj datum; prelaz više pragova.
5. `race`/`strength`/`tempo`: tipovi; `strength.10` na 10. DONE STRENGTH.
6. `pb`: jedan log po distanci = nema; 50:00 pa 48:00 → otključan na drugi; sporiji ne otključava.
7. `weeklyChallenge`: van plana → null; 4 planirana, 2 DONE → `2/4`; LONG planiran ali ne DONE → `longDone false`; sve DONE → `complete`.

## E2E (`app/e2e/achievements.spec.ts`, Playwright)

- `register` + `completeOnboarding` iz `helpers.ts`; isti forecast/AQI `page.route` mock-ovi kao `app.spec.ts`.
- `/today` → `Urađeno` → modal (`Trajanje` 50:00) → `Sačuvaj` →
  `expect(page.getByTestId('achievement-toast')).toContainText('Prvi trening')`; toast se sklanja.
- `/stats` → sekcija `Dostignuća` → tile `Prvi trening` `data-state="earned"`; `5 treninga`
  `data-state="locked"` sa progresom `1/5`.
- Reload `/today` → toast se NE pojavljuje ponovo (`seen`). Novi spec ne dira postojeće: toast ne
  sadrži `Urađeno`/`Zabeleži trening` (nema kolizije sa `getByText(..., { exact: true })` u
  `app.spec.ts`) i ne hvata pointer; `responsive.spec.ts` ostaje zelen (320px bez overflow-a).

## Rizici / odluke

- `seen` je per-uređaj; cross-device ponavljanje toasta prihvaćeno (nema tabele). `km` prati
  logove kao StatsPage; DONE run bez loga ulazi u `sessions`, ne u `km` — dokumentovano.
- `progress.ts` se ne dira: `runStreak` (dnevni) ostaje; nedeljni niz je nova funkcija u shared.
  Bez `::ng-deep` i novih zavisnosti; Tailwind utilities + postojeći primitivi, BEM samo ako
  utilities ne mogu; stringovi su u shared modulu do L3 migracije na i18n ključeve (`content`).
