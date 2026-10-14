# Date, time and timezone audit

Scope: every date/time flow that stores, computes or renders calendar days in the app, the shared
package and the database. Date-only values (`workouts.workout_date`, `races.race_date`,
`plans.start_date`, `run_logs.log_date`) are civil dates owned by the device timezone;
`timestamptz` columns (`created_at` and similar) are instants. The audit verifies that the two
never mix and that all "today" derivations use the device local day.

## Inventory

| Flow                                            | Storage                                              | Computation                                                                                                                                                                                | Timezone assumption                                     | Verdict                                                                                                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan generation                                 | `plans.start_date`, `workouts.workout_date` (`date`) | `packages/shared/src/dates.ts` (`addDays`, `dayDiff`, `weekdayOf`, `startOfWeek`), pure UTC-anchored date math; start from `todayIso()` (device local)                                     | None, date-only strings                                 | OK                                                                                                                                                                                    |
| Race day countdown                              | `races.race_date` (`date`)                           | `dayDiff(todayIso(), race_date)`, local today                                                                                                                                              | Device local day                                        | OK                                                                                                                                                                                    |
| Manual log / benchmark                          | `run_logs.log_date` (`date`)                         | `log_workout` copies the workout date; benchmark insert uses `todayIso()`                                                                                                                  | Device local day                                        | OK                                                                                                                                                                                    |
| Health import duplicate check and workout match | none                                                 | `classifyRun` / `matchWorkoutId` used `deviceTimeZone()` of the shared module (fallback UTC) while the app passed its own zone (fallback Europe/Belgrade) and inserted `toLogDate` with it | Hidden process/device zone, two different fallbacks     | Fixed: both take an explicit `timeZone`; app passes `deviceTimeZone()` once for classify, match and insert (`packages/shared/src/health.ts:61`, `app/src/features/health/queries.ts`) |
| Health import initial window                    | none                                                 | `since` was `<local date>T00:00:00.000Z` (local civil date pinned to UTC midnight), which drops runs from the first local evening west of UTC                                              | Local date vs UTC instant                               | Fixed: `localMidnightInstant()` converts the local date to its real instant (`app/src/lib/dates.ts`)                                                                                  |
| Readiness lookback                              | localStorage                                         | `Date.now() - 20h` instant                                                                                                                                                                 | None                                                    | OK                                                                                                                                                                                    |
| ICS export                                      | file                                                 | floating `DTSTART`/`DTEND` without `Z` or `TZID`, so the calendar keeps the wall-clock day in every zone                                                                                   | Floating local date                                     | OK, crossing midnight covered by test                                                                                                                                                 |
| Google Calendar link                            | URL                                                  | same floating format as ICS                                                                                                                                                                | Floating local date                                     | OK                                                                                                                                                                                    |
| FIT / TCX export                                | file                                                 | file id / activity id was `<date>T00:00:00Z`, so watches west of UTC showed the workout on the previous local day                                                                          | Watch applies its own zone to the instant               | Fixed: optional `startAt`; the app passes the local midnight instant                                                                                                                  |
| Weekly leaderboards                             | `p_week_start date` param                            | client computes the local week start, RPCs compare `log_date` to `p_week_start + 7`                                                                                                        | TZ-safe date columns                                    | OK                                                                                                                                                                                    |
| `apply_week_plan`                               | `date` bounds against plan start and race            | no `now()`                                                                                                                                                                                 | TZ-safe                                                 | OK                                                                                                                                                                                    |
| `scale_week_volume`                             | `p_week_start date` from client                      | no `now()`                                                                                                                                                                                 | TZ-safe                                                 | OK                                                                                                                                                                                    |
| `recalibrate_plan`                              | `date` column                                        | filtered with server `current_date` (UTC): for users behind UTC today's planned workouts were skipped, for users ahead yesterday's were still recalibrated                                 | Server UTC vs user local day                            | Fixed: `p_today date default null`, client sends `todayIso()` (migration `20261014024500_recalibrate_plan_local_today.sql`)                                                           |
| Push reminders                                  | `push_subscriptions.timezone`, `remind_hour`         | function builds `localDate`/`localHour`/`localWeekday` per subscription with `Intl`, hourly cron                                                                                           | Per subscription IANA zone, DST correct                 | OK, decision below                                                                                                                                                                    |
| Weather windows                                 | Open-Meteo `timezone=auto` for profile coordinates   | hourly strings matched to workout dates by prefix                                                                                                                                          | Profile coordinate zone vs device zone while travelling | Known limitation, no fix                                                                                                                                                              |
| E2E helpers                                     | none                                                 | `isoFromNow` / `dayIso` added milliseconds to `Date.now()`, which lands on the previous local day when a 25-hour DST day is involved                                                       | Device local day                                        | Fixed: local Y/M/D component arithmetic                                                                                                                                               |

## Fixes in this wave

1. `classifyRun` and `matchWorkoutId` accept an explicit `timeZone`; the app computes
   `deviceTimeZone()` once and uses it for classification, matching and log dates. This removed a
   real failure: with `TZ=Pacific/Kiritimati` six health tests failed before, because the test
   noon-UTC run and the process/device zone disagreed on the day.
2. The health import initial window starts at the local midnight instant, not at local date plus
   `Z`.
3. `recalibrate_plan` gains `p_today date default null` and uses
   `coalesce(p_today, current_date)`; the client sends the local date.
4. FIT and TCX exports accept `startAt`; the app passes the local midnight instant so the
   exported workout keeps its civil date on devices west and east of UTC.
5. E2E date helpers use local date components instead of millisecond addition.
6. `deviceTimeZone()` lives in `app/src/lib/dates.ts` and is reused by health import and push
   settings, so the fallback (`Europe/Belgrade`) is defined once.

## Boundary tests added

- `packages/shared/src/dates.test.ts` (new): week start and `addDays`/`dayDiff` across the
  Europe/Belgrade DST nights of 2026-03-29 and 2026-10-25, leap day 2028-02-29 and non-leap
  2027-02-28, month and year rollovers, `weekdayOf` Monday anchor, `startOfWeek` year boundary.
- `packages/shared/src/health.test.ts`: explicit-zone classification and matching, including a
  02:00 UTC run that belongs to the previous local day in `America/Los_Angeles`; the suite is now
  timezone independent (verified with `TZ=Pacific/Kiritimati`, `TZ=America/New_York`,
  `TZ=Europe/Belgrade`).
- `packages/shared/src/ics.test.ts`: a 23:00 event with 120 minutes ends at `T010000` next day,
  no `Z`, and the Google Calendar URL matches.
- `packages/shared/src/fit.test.ts`, `packages/shared/src/tcx.test.ts`: `startAt` pins the
  timestamp for both formats.
- `packages/shared/src/plan-generator.test.ts`: a one-week plan whose race falls on the spring
  DST night keeps all seven dates, and a 34-week plan across both DST transitions keeps every
  date unique, sorted and inside `[startDate, raceDate]`.
- `app/e2e/dates.spec.ts` (new, `timezoneId: 'America/New_York'`, clock fixed at
  2026-01-05T23:30:00-05:00, which is already 2026-01-06 in UTC): the plan starts on the local
  day, every workout is on or after it, the today page renders the local day, and a logged
  workout gets `log_date` of the local day.

## Reminder timezone decision

`push_subscriptions.timezone` already stores the browser zone at subscribe time
(`Intl.DateTimeFormat().resolvedOptions().timeZone`) and the function computes the local date,
hour and weekday per subscription with `Intl`, so the 7h and `remind_hour` promises are local and
DST correct. No `profiles.timezone` column was added: it would duplicate the subscription value
and the function never needs it. Two documented limits: the zone is only written when push is
enabled, so it goes stale if the device zone changes without re-enabling (a concrete follow-up is
syncing it inside `useUpdatePushPreferences`), and the hourly UTC cron means zones with a 30 or 45
minute offset get reminders at :30 past `remind_hour`; whole-hour zones such as Europe/Belgrade
and America/New_York are exact.

## Verification

- `npx supabase db reset` applies 23 migrations clean, including
  `20261014024500_recalibrate_plan_local_today.sql`.
- `npx prettier --check` on touched files, `npm run typecheck`, `npm run lint` (0 errors),
  `npm run test` (356, was 338).
- `PLAYWRIGHT_OUTPUT_DIR=/tmp/pw-dates npx playwright test` all green.
