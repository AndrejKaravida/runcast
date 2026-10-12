# F8 (R3) — Arhitektura: `ics.ts` + export

## Shared `packages/shared/src/ics.ts` (pure TS, bez DOM/fetch)

```ts
export interface IcsEvent {
  uid: string; // workout-<id>@runcast.app
  date: string; // YYYY-MM-DD, lokalni datum treninga (ne UTC)
  startHour: number; // 0–23
  durationMinutes: number; // >= 1
  summary: string;
  description: string;
}
export interface IcsWorkout {
  id: string;
  date: string;
  type: WorkoutType;
  title: string;
  distanceKm: number;
  durationSec: number | null;
  steps: WorkoutStep[];
}
export const RUN_WINDOW_START_HOUR: Record<RunWindow, number>; // 7 / 18 / 9
export function escapeIcsText(value: string): string;
export function foldIcsLine(line: string, maxOctets = 75): string;
export function buildIcs(events: IcsEvent[], options?: { prodId?: string; now?: Date }): string;
export function buildPlanEvents(
  workouts: IcsWorkout[],
  options: { runWindow: RunWindow; paces?: PlanPaces | null },
): IcsEvent[];
export function buildGoogleCalendarUrl(event: IcsEvent): string;
```

- `index.ts` dobija `export * from './ics';` (jedna linija).
- `escapeIcsText`: normalizuj `\r\n|\r` → `\n`; `\` → `\\`; `;` → `\;`; `,` → `\,`;
  na kraju `\n` → literal `\n` (redosled je obavezan). Primenjuje se samo na SUMMARY/DESCRIPTION.
- `foldIcsLine`: meri UTF-8 oktete (`TextEncoder`) dok se ne pređe 75; nastavak = `\r\n` + space
  (space ulazi u budžet); nikad ne lomi code point sa više bajtova.
- `buildIcs`: `BEGIN:VCALENDAR` / `VERSION:2.0` / `PRODID:-//RunCast//Plan Export 1.0//SR` →
  po eventu `BEGIN:VEVENT`, `UID`, `DTSTAMP:<now Z>`, `DTSTART:<date>T<HH>0000`,
  `DTEND:<start + durationMinutes>`, `SUMMARY`, `DESCRIPTION`, `END:VEVENT` → `END:VCALENDAR`;
  svaka linija fold-ovana i CRLF-terminisana (i poslednja); `now` injektabilan za testove
  (default `new Date()`); bez `TZID` i bez `Z` na DTSTART/DTEND.
- `buildPlanEvents`: filtrira `type !== 'REST'`; sat iz `RUN_WINDOW_START_HOUR`;
  `durationMinutes = max(1, round((durationSec ?? sum(steps.durationSec) ??
distanceKm × easySlowSecPerKm ?? distanceKm × 360) / 60))`; `uid = workout-<id>@runcast.app`;
  description = `${title}\n\n${koraci numerisani}\n\nRunCast plan`; korak koristi postojeći
  `formatPace`/`formatDuration` iz shared-a (bez novih formattera).
- `buildGoogleCalendarUrl`: `https://calendar.google.com/calendar/render?action=TEMPLATE` +
  `URLSearchParams` sa `text`, `dates` (`YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS`, bez `Z`, bez `ctz`),
  `details`; iste stringove preuzeti iz eventa (bez ICS escape-a — Google enkodira sam).

## App integracije

- `app/src/features/plans/export.ts`:
  - `toIcsWorkout(row: WorkoutsRow): IcsWorkout` — mapiranje `workout_date`→`date`,
    `distance_km`→`distanceKm`, `duration_sec`→`durationSec`, koraci preko postojećeg
    `workoutSteps` iz `features/workouts/utils.ts` (reuse, bez dupliranja cast-a).
  - `useExportPlanIcs()` — `useMutation`: supabase `workouts.select('*').eq('plan_id', plan.id)`
    (samo na klik, bez novog fetch-a na renderu); `buildPlanEvents` → `buildIcs` →
    `Blob([text], { type: 'text/calendar;charset=utf-8' })` → `URL.createObjectURL` +
    `<a download="runcast-plan.ics">` + `URL.revokeObjectURL`.
- `SettingsPage.tsx`: `useExportPlanIcs()` + dugme u „Plan“ kartici (postojeći `notice/error`);
  `useProfile` već postoji na strani za `run_window`; bez novih hookova na renderu.
- `WorkoutPage.tsx`: `buildGoogleCalendarUrlForWorkout(workout, { runWindow, paces })` pomoćnik
  u `export.ts` (strana ne zna detalje); render mali link u top baru, samo `type !== 'REST'`;
  `plan` je već keširan (`useActivePlan`), `profile` takođe (`useProfile`).
- Bez ruta, migracija, novih depova; `Blob`/`URL`/`URLSearchParams`/`TextEncoder` su globali.

## Unit testovi (`packages/shared/src/ics.test.ts`, vitest)

1. `escapeIcsText`: `\,` → `\\\,` (bez duplog escape-a), `a,b;c` → `a\,b\;c`, `\n` → literal `\n`.
2. `foldIcsLine`: svaka fizička linija ≤75 okteta (`TextEncoder`), nastavci počinju jednim
   space-om, unfold vraća original; linija sa „čćžšđ“ se ne lomi usred karaktera.
3. `buildIcs`: prva linija `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID`, poslednja `END:VCALENDAR`; sve linije `\r\n` (nema golog `\n`); prazan niz daje validan envelope.
4. VEVENT polja: UID `workout-<id>@runcast.app`, `DTSTAMP:…Z` iz fiksnog `now`,
   `DTSTART:<date>T070000`, `DTEND` = start + trajanje, SUMMARY/DESCRIPTION escape-ovani;
   bez `TZID` i bez `Z` na DTSTART/DTEND.
5. `buildPlanEvents` po `run_window`: morning 07:00, evening 18:00, flexible 09:00;
   REST izbačen, STRENGTH uključen; trajanje: `durationSec` → zbir koraka →
   `distanceKm × easySlow` → default 6:00/km; min 1 min.
6. `buildGoogleCalendarUrl`: `action=TEMPLATE`, `text`/`details` enkodovani,
   `dates` bez `Z`, bez `ctz`; poklapa se sa satom/trajanjem iz eventa.

## E2E (`app/e2e/ics.spec.ts`, Playwright)

- `register` + `completeOnboarding` iz `helpers.ts`; isti forecast/AQI `page.route` mock-ovi
  kao `app.spec.ts` (bez mrežnog flake-a).
- `/settings` → `page.waitForEvent('download')` → klik `Izvezi plan (.ics)` →
  `suggestedFilename() === 'runcast-plan.ics'` → pročitaj tekst preko `download.path()`.
- Parse/assert: `BEGIN:VCALENDAR` na startu, `VERSION:2.0`, `PRODID`, `END:VCALENDAR` na kraju;
  `BEGIN:VEVENT` count = `END:VEVENT` count = broj UID-jeva; UID-ovi jedinstveni; nema
  `SUMMARY:Odmor`; postoji bar jedan strength naslov („Snaga…“ / „Mobilnost…“).
- Count provera: `generatePlan` iz `@runcast/shared` sa istim onboarding inputima
  (race +126 dana, longRunDay 0, goal 3:45:00) → broj non-REST draftova = broj VEVENT-a;
  ako onboarding defaulti driftuju, test pada i pokazuje drift.
- Spot-check: prvi EASY iz drafta → u fajlu `DTSTART:<date>T070000` i odgovarajući `SUMMARY` (floating sat + escaping).
- Google: na `/workout/<id>` non-REST treninga `data-testid="add-google"` vidljiv i `href`
  sadrži `calendar.google.com/calendar/render?action=TEMPLATE` + `text=`; na REST ne postoji.
- Bez izmena postojećih spec fajlova; `responsive.spec.ts` ostaje zelen.
