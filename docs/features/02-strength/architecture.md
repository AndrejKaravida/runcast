# F2 — Snaga & mobilnost: arhitektura

## Integracija u generatePlan (runs stay identical)

`buildWeek` posle postojeće petlje NE dodaje nove dane: svaki dan koji nije run/race je danas `REST`; strength se ubacuje **na mesto REST-a** preko mape `date → WorkoutDraft`. Run grane se ne diraju.

- `WeekBuildParams` dobija `phaseWeek: number` (nedelja unutar faze, 0-based; oba loop-a ga prate: promena faze → 0, inače ++).
- U `buildWeek`: `const strengthByDate = new Map(strengthWorkoutsForWeek({...}).map((w) => [w.date, w]))` gde je `runDays = [...layout.qualityDays, ...layout.easyDays, layout.longRunDay].filter(d => d >= 0)`, `daysToRace = dayDiff(params.weekStart, params.raceDate)`, `isRaceWeek`, `experience` (novo polje u params, iz `config`).
- Fallthrough: `workouts.push(strengthByDate.get(date) ?? restWorkout(date, params.phase, params.weekIndex))`.
- Race week (`raceWeekLayout`, `longRunDay = -1`): `strengthWorkoutsForWeek` vraća `[]`.
- Anchor-less grana (`anchor === null || weeks < 12`): isti poziv, faza `BASE/TAPER`, `phaseWeek` po istom pravilu.

### Tabela pravila (dPW / longRunDay / faza) — provjereno probom nad stvarnim `buildLayout`

| Slučaj                                 | Run dani (Pon=0) | REST → Strength                                   | Sesije                                |
| -------------------------------------- | ---------------- | ------------------------------------------------- | ------------------------------------- |
| 4 / 0 / BASE (bez kvaliteta)           | 0,2,3,4          | REST {1,5,6} − dan pre dugog (6) → 1,5 (uto, sub) | A + Mobilnost 20 min                  |
| 4 / 0 / BUILD i PEAK (1 kvalitet, sre) | 0,2,3,4          | REST {1,5,6} − 6 → 1,5                            | A + B (PEAK: MAINTENANCE + Mobilnost) |
| 4 / 0 / TAPER, do trke ≥ 10 d          | 0,2,3,4          | REST {1,5,6} − 6, cilj 1 → 1                      | Mobilnost 20 min (1×)                 |
| 4 / 0 / TAPER < 10 d ili race week     | 0,2,3,4          | —                                                 | 0                                     |
| 3 / 0 / BUILD                          | 0,2,4            | REST {1,3,5,6} − 6 → 1,3                          | A + B, ali ≤ 2                        |
| 5 / 6 / BUILD                          | 1,2,3,4,6        | REST {0,5} − dan pre dugog (5) → 0                | A (samo preostali REST)               |
| 6 bilo koji                            | 6 run dana       | najviše 1 (često 0)                               | A ili 0                               |

Napomena: invarijanta „nikad na run danu, danu pre long run-a, danu trke ni danu pre trke” testira se za svih 7 `longRunDay` vrijednosti; gornji primjer BUILD-a za dPW4 je {0,2,3,4} (jedan kvalitet, sre), a ne {0,2,4,5}.

Algoritam (`strengthDaysFor`): (1) race week → `[]`; (2) cilj: BASE/BUILD/PEAK = 2, TAPER = 1 ako `daysToRace >= 10`; (3) kandidati = REST dani − `(longRunDay + 6) % 7` − race dan i dan pre trke; (4) greedy od najranijeg: uzmi kandidata koji nije susedan (gap 1) već izabranima; ako ih je manje od cilja, dopuni najranijim preostalima; (5) sortirano rastuće. Time je garantovano: nijedan STRENGTH nije na run danu, danu pre long run-a, danu trke ni danu pre trke.

## `packages/shared/src/strength.ts` (pure, bez zavisnosti)

```ts
export interface StrengthWeekInput {
  weekStart: string;
  weekIndex: number;
  phaseWeek: number;
  phase: PlanPhase;
  daysPerWeek: 3 | 4 | 5 | 6;
  longRunDay: number;
  runDays: number[];
  experience: Experience;
  isRaceWeek: boolean;
  daysToRace: number;
}
export function strengthDaysFor(input: StrengthWeekInput): number[];
export function strengthWorkoutsForWeek(input: StrengthWeekInput): WorkoutDraft[];
```

Interne strukture: `type ExerciseKind = 'legs' | 'glutes' | 'core' | 'plyo' | 'mobility'`; `interface Exercise { kind; label; sets; reps; durationSec }`; `type TemplateId = 'A' | 'B' | 'MOBILITY'`; `exercisesFor(templateId, phase, phaseWeek, experience): Exercise[]`. Korak = `{ label: \`${label} — ${sets}×${reps}\`, durationSec }`; mobility/plyo bez setova imaju fiksni `durationSec`i label tipa`Poskoci — 3×10`/`Disanje i opuštanje — 3 min`. Sesija: `type: 'STRENGTH'`, `distanceKm: 0`, `paceZone: null`, `phase`, `weekIndex`, `durationSec` = zbir koraka (min 20 min, max 35 min).

Fazna progresija (library):

| Faza / nedelja | A (noge i core)                                                            | B (glute i core)          | Mobilnost                        |
| -------------- | -------------------------------------------------------------------------- | ------------------------- | -------------------------------- |
| BASE w0        | čučnjevi 3×10, iskoraci 3×10, glute most 3×12, plank 3×40 s, dead bug 3×10 | —                         | 20 min flow                      |
| BASE w1+       | 3×12 (isto)                                                                | —                         | 20 min                           |
| BUILD w0       | 3×10 + plyo (samo experienced)                                             | single-leg varijante 3×10 | —                                |
| BUILD w1+      | experienced 4×8, first 3×12                                                | 4×8 / 3×12                | —                                |
| PEAK           | 2×12 održavanje, bez plyo                                                  | —                         | 20 min                           |
| TAPER          | —                                                                          | —                         | 20 min (samo prva taper nedelja) |

`experience: 'first'` nikad ne dobija `plyo` vježbe; `daysPerWeek >= 5` smanjuje cilj na 1 ako je dostupan samo 1 REST dan (bez izuzetka).

## Migracija (baza)

`npx supabase migration new strength_workout_type` (ime fajla = verzija, obavezno zbog GitHub auto-migracija); lokalno `npx supabase migration up`.

```sql
alter table public.workouts drop constraint if exists workouts_type_check;
alter table public.workouts add constraint workouts_type_check
  check (type in ('EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'REST', 'RACE', 'STRENGTH'));
```

Napomena u dokumentaciji: migracija na prod ide na push; mali race-window ako app deploy stigne pre migracije (insert STRENGTH padne na constraint) — prihvaćen rizik, bez novih tabela/RPC-ova.

## UI izmene (samo dozvoljeni fajlovi)

- **types.ts**: `WorkoutType` + `'STRENGTH'`; `index.ts` + `export * from './strength'`.
- **PlanPage.tsx**: `dotClass` — `if (workout.type === 'STRENGTH') return TONE_DOT_CLASSES.warning`; LEGEND + `{ label: 'Snaga', dot: 'bg-warning' }`; `WeekRow` label: `workout.type === 'STRENGTH' ? 'Snaga' : typeLabel(workout.type)`.
- **TodayPage.tsx**: `isStrength = todayWorkout?.type === 'STRENGTH'`; `showVerdict` dobija `&& !isStrength` (kišni banner/swap ne dira STRENGTH; `pickSwapCandidate` ionako bira samo EASY/REST); steps lista renderuje `step.durationSec` (`formatDuration`) kad nema `pace`; dugme: `isStrength ? 'Završi trening' : 'Urađeno'`, za STRENGTH direktni `useMutation` update `workouts.status = 'DONE'` + invalidacija `['workouts']`/`['workout']` (bez `run_log`-a); `data-testid` za DONE ostaje samo na run grani.
- **WorkoutPage.tsx**: `isStrength`; badge trajanja kad je STRENGTH; `showWeather` isključuje STRENGTH; steps lista prikazuje trajanje umesto `/km`; „Završi trening” direktni DONE (isti mali mutation); „Preskoči” nepromenjen.
- Duplirani mini-mutation u dvije strane je posledica F2 file-liste (nema izmene `features/logs/queries.ts`); alternativa je odobrenje za `useCompleteWorkout` (vidi otvorena pitanja).

## Testovi

`packages/shared/src/strength.test.ts` (vitest, pure):

1. race week i `daysToRace < 10` u TAPER → `[]`.
2. BASE dPW4 lRD0 (`runDays [0,2,3,4]`) → dani `[1,5]`, naslovi `Snaga A — noge i core` + `Mobilnost 20 min`.
3. BUILD dPW4 lRD0 `runDays [0,2,3,4]` → `[1,5]` (contract primer), `Snaga B`.
4. za svaki `longRunDay` 0–6: nijedan dan nije `(longRunDay+6)%7` i nijedan nije u `runDays`.
5. TAPER ≥ 10 dana → tačno 1 mobilnost; PEAK → `Snaga — održavanje` ≤ 25 min.
6. `first` → nijedan step nije plyo; experienced BUILD w1+ → 4×8 u labelu.
7. ugovor polja svake stavke: `type/distanceKm/durationSec/paceZone/steps` + regex labele `/(— \d+×\d+|— \d+ min|— \d+ s)/`.
8. determinizam (isti input → isti output), dani sortirani, ≤ broj REST dana, datumi u `weekStart..weekStart+6`.
9. `daysPerWeek 3` → max 2; `daysPerWeek 6` → ≤ 1.

## Izmene postojećih testova (jedina dozvoljena)

- `plan-generator.test.ts`, test „respects three runs per week and a shifted long run day” (linije ~119–129): brojanje `type !== 'REST'` zameniti brojanjem run tipova (`EASY/LONG/TEMPO/INTERVALS/REPETITIONS`), jer STRENGTH zamenjuje REST pa bi inače pao. Ostali testovi (126 workout-a, faze, taper, pace) ostaju netaknuti.
- `weather-rules.test.ts` i `app/e2e/app.spec.ts`: bez izmena; swap pool (EASY, pa REST) ne može izabrati STRENGTH; `week-row` i dalje 7 redova jer strength zamenjuje REST.
