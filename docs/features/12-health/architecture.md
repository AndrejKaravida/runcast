# F12/R3 — Arhitektura: HealthSource adapter → run_logs

## 1. `packages/shared/src/health.ts` (pure TS, bez DOM-a)

```ts
export interface HealthRun {
  date: string; // ISO instant početka (UTC)
  distanceKm: number | null;
  durationSec: number;
  externalId: string; // HK UUID / HC metadata ID
  source: 'healthkit' | 'healthconnect';
  sourceName: string; // npr. 'Apple Watch', 'Mi Fitness'
}
export function classifyRun(run: HealthRun, context: ImportContext): 'import' | 'duplicate' | 'imported';
export function toLogDate(run: HealthRun, timeZone: string): string; // lokalni YYYY-MM-DD
export function matchWorkoutId(run: HealthRun, workouts: WorkoutRef[]): string | null;
```

- `ImportContext = { existing: Array<{ log_date; distance_km; duration_sec }>; importedExternalIds:
string[] }`; `WorkoutRef = { id; workout_date; type; status }`.
- `classifyRun`: `externalId` u `importedExternalIds` → `'imported'`; log istog `log_date` sa
  `|Δdistance| ≤ 0.05 km` (null distance → trajanje) i `|Δduration| ≤ 60 s` → `'duplicate'`.
- `toLogDate`: `Intl.DateTimeFormat('en-CA', { timeZone })` nad `run.date`; `matchWorkoutId`:
  `isRunWorkout(type)` + status `PLANNED|DONE` + isti datum, `id` samo ako je tačno jedan.
- Testovi `health.test.ts`: verdict-i, granice tolerancija (0.05 km / 60 s), null distanca, dva
  treninga u danu → null, trka preko ponoći i različite zone.

## 2. Adapter `app/src/features/health/adapter.ts`

```ts
export interface HealthSource {
  isAvailable(): Promise<'available' | 'needs-install' | 'unavailable'>;
  requestPermissions(): Promise<boolean>;
  fetchRuns(sinceIso: string): Promise<HealthRun[]>;
}
export function getHealthSource(): HealthSource; // ios | android | mock | web stub
```

- `CapacitorHealthSource` (jedna klasa, izvor iz `Capacitor.getPlatform()`), preko
  `@capgo/capacitor-health`:
  - `isAvailable()` → plugin `isAvailable()`; Android `reason` o instalaciji → `needs-install`.
  - `requestPermissions()` → `requestAuthorization({ read: ['workouts'], write: [],
requestHistoryAccess: true })`; iOS read grant se ne vidi → `true` ako poziv uspe (denied se
    manifestuje kao prazan `fetchRuns`).
  - `fetchRuns(sinceIso)`: `queryWorkouts({ startDate, endDate: now, limit: 100 })` u petlji dok
    `anchor` postoji (pagination); filtrira trčanje preko `isRunningWorkoutType` (`running`,
    `runningTreadmill`) i mapira u `HealthRun` (`totalDistance` m → km, `platformId` → `externalId`).
- `MockHealthSource`: aktivna ako `window.__runcastHealthMock` postoji (E2E/preview); vraća unete
  `runs` i `available` — test bez native okruženja.
- `WebStubSource`: `isAvailable() → 'unavailable'`, prazan fetch; koristi se na webu bez mock-a.
- Fabrika: mock → (`ios`/`android` → CapacitorHealthSource) → web stub; dinamički `import` plugin-a
  ide samo u native grani (web bundle bez plugin koda).

## 3. Uvoz `app/src/features/health/queries.ts`

- `useHealthIntegration()`: čita localStorage stanje (`runcast.health.autosync`, `lastSync`) + status.
- `useImportHealthRuns()` (react-query mutacija):
  1. `source = getHealthSource()`; `since = lastSync?.at ?? today − 90 dana`; `runs = fetchRuns(since)`.
  2. `existing` iz `run_logs` (limit 300, kao `useRunLogs`); `workouts` iz aktivnog plana (F2/F4 izvor).
  3. `classifyRun` → samo `'import'`; `matchWorkoutId` → `workout_id`.
  4. Batch (100) `insert` u `run_logs`: `user_id, workout_id, log_date, distance_km, duration_sec,
avg_pace_sec_per_km = round(duration/distance), notes: 'Uvezeno: ' + sourceName, external_id`.
  5. Povezani trening koji je `PLANNED` → `update({ status: 'DONE' }).in('id', ids)`.
  6. `localStorage.runcast.health.lastSync = { at, imported, skipped }`; invalidate `['workouts']`,
     `['workout']`, `['run-logs']` (postojeći `invalidateWorkoutData`, logs/queries.ts:15).
- Zašto insert a ne `log_workout` RPC (20261013010345:1-29): RPC traži PLANNED status, ne prima
  `external_id`; insert pokrivaju postojeće RLS politike (init šema), kao benchmark log (logs/queries.ts:83).
- Bez novih RPC-a i bez Edge Function — sve sa klijenta; podaci idu samo u `run_logs`.

## 4. Migracija (`supabase/migrations/<nova>_run_logs_external_id.sql`)

```sql
alter table public.run_logs add column external_id text;
create unique index run_logs_user_external_uidx
  on public.run_logs (user_id, external_id) where external_id is not null;
```

- Alternativa „externalId u `notes` prefiksu" odbačena: bez unique constraint-a i krhko; kolona je aditivna, bez RLS izmena.
- Kreirati preko `npx supabase migration new`; na prod ide automatski na push (CONTRACTS.md).
- `external_id` se u v1 ne prikazuje korisniku; `log_workout` RPC se ne dira.

## 5. UI `app/src/components/settings/HealthIntegrations.tsx` + `SettingsPage.tsx`

- `HealthIntegrations`: bez props-a; `AppCard` sa redovima po platformi, `AppBadge`, `AppButton`,
  toggle auto-uvoza i „Poslednji uvoz" red.
- Status: `unavailable` → info red (web); `needs-install` → uputstvo + dugme; `available` →
  „Poveži" pa „Uvezi trčanja"; posle uspešnog uvoza → „Povezano".
- `SettingsPage.tsx`: `<HealthIntegrations />` posle sekcije Trening (SettingsPage.tsx:253-293).
- i18n `settings.json` → `integrations.*` (sr/en); postojeći primitive, bez novih zavisnosti.

## 6. E2E `app/e2e/health.spec.ts`

- Mock preko `page.addInitScript` (push.spec.ts:10): `window.__runcastHealthMock = { available, runs }`.
- Scenario 1: bez mock-a (web) → Settings prikazuje „Dostupno u mobilnoj aplikaciji", bez dugmadi.
- Scenario 2: onboarding → mock 2 trčanja (jedno poklapa PLANNED workout) → „Uvezi trčanja" → „Uvezeno 2"; Today DONE.
- Scenario 3: ponovni uvoz → „Nema novih trčanja" (`external_id` dedupe).
- Postojeći `app.spec.ts`/`responsive.spec.ts` netaknuti.

## 7. Rizici, ivice i redosled

- Zamena plugina: sve plugin-specific je u `adapter.ts` (alternative: Capawesome — plaćen; zvanični health-fitness — iOS-only workout).
- Manifest: merge `READ_EXERCISE` + `READ_HEALTH_DATA_HISTORY`; Play deklaracija + privacy policy su release preduslov.
- iOS denied = prazno: UI tekst pokriva „nema trčanja ili pristup nije dozvoljen".
- HC 30-dnevni cap na starijim provajderima (history permission tiho preskočen) → kraći uvoz; hint.
- „Dva trčanja u danu" su realna: matching samo kad je jedan workout; tolerancije mogu lažno označiti duplikat.
- Xiaomi sync je van naše kontrole (korisnik ga uključuje u Mi Fitness/Zepp); poruka u UI.
- Redosled: 1) migracija → 2) shared `health.ts` + testovi → 3) adapter + mock → 4) queries + UI → 5) e2e → 6) native smoke (Android `npx cap sync android` + ručni test; iOS tek uz Xcode).
