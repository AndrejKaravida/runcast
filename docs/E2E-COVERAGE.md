# E2E coverage

Scope: functional coverage of the admin-facing runner app through Playwright (`app/e2e`, 56 spec
files, 118 tests). Specs run against local Supabase and the Vite dev server; several specs assert
real database state with an authenticated supabase-js client on top of the UI flow.

## Coverage map

| Spec                           | Flows covered                                                                                                                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y.spec.ts`                 | Keyboard tab order on login, linked field errors on register, modal Escape and focus return, guided start via keyboard, skip link on Today                                                                                                         |
| `account.spec.ts`              | Data export (profile, empty log list), account deletion end to end, delete confirmation text gating, export after a logged run                                                                                                                     |
| `achievements.spec.ts`         | First badge toast, weekly challenge, seen state persistence                                                                                                                                                                                        |
| `adherence.spec.ts`            | Adherence leaderboard, global and friends scopes                                                                                                                                                                                                   |
| `app.spec.ts`                  | Golden path register, onboarding, plan, workout, stats, logout and login; rain swap; protected routes; form validations; workout detail, skip, profile save, plan regeneration; forgot password; reduced motion; 404 page and wrong password error |
| `benchmark.spec.ts`            | Benchmark test race and pace recalibration                                                                                                                                                                                                         |
| `coach.spec.ts`                | Adaptive coach RPE insight scales the next week                                                                                                                                                                                                    |
| `consent.spec.ts`              | Terms checkbox gating registration, legal links, accepted registration                                                                                                                                                                             |
| `contrast.spec.ts`             | AA text contrast in both themes                                                                                                                                                                                                                    |
| `dates.spec.ts`                | Local date near midnight, log date equals local day, per-zone health import                                                                                                                                                                        |
| `error-boundary.spec.ts`       | Dynamic module failure screen, profile query error with retry                                                                                                                                                                                      |
| `fit.spec.ts`                  | FIT export binary file with valid CRC                                                                                                                                                                                                              |
| `fueling.spec.ts`              | Gel schedule card, gel reminder in guided long run, reminders off hides the line                                                                                                                                                                   |
| `gear.spec.ts`                 | Shoe mileage from runs, retire, delete, recent activity                                                                                                                                                                                            |
| `guided-audio.spec.ts`         | BRIEF on start, COACH on skip, mute silences speech                                                                                                                                                                                                |
| `guided.spec.ts`               | Guided run flow with timeScale, pause, mute, next and back, finish and log                                                                                                                                                                         |
| `health.spec.ts`               | Web fallback message, import run links todays planned workout, re-import without duplicates                                                                                                                                                        |
| `i18n.spec.ts`                 | Language switch leaves no raw keys on key pages                                                                                                                                                                                                    |
| `ics.spec.ts`                  | ICS export of the full plan, Google Calendar link only for non-rest workouts                                                                                                                                                                       |
| `licenses.spec.ts`             | Licenses page entries, Open-Meteo attribution on Today                                                                                                                                                                                             |
| `live-tracker.spec.ts`         | GPS live tracker distance, progress and split; denied GPS manual fallback and log from plan                                                                                                                                                        |
| `locale.spec.ts`               | Default sr, navigator detection, localStorage override, settings switch persists across reload                                                                                                                                                     |
| `offline.spec.ts`              | Built preview manifest, icons and registered service worker, app shell offline for visited and new routes                                                                                                                                          |
| `onboarding-variants.spec.ts`  | No-race base plan, recent race anchor without goal, 10K race distance and goal, experienced with gt60 volume, all with database assertions                                                                                                         |
| `plan-days.spec.ts`            | Workouts only on selected days, wrong day count error, settings prefill and regeneration by days                                                                                                                                                   |
| `plan-deep.spec.ts`            | Calendar cell navigation to workout, month navigation and back to today, base-plan confirm dialog and base plan persistence                                                                                                                        |
| `predictor.spec.ts`            | Race prediction and personal bests with real log data                                                                                                                                                                                              |
| `premium.spec.ts`              | Free lock on races section, learn-more dialog, unlock after premium flip, add race, set goal, regenerate, race chip, free user has no target race select                                                                                           |
| `profile.spec.ts`              | Avatar upload persists, public profile toggle                                                                                                                                                                                                      |
| `push.spec.ts`                 | Enable status, toggle set and reminder hour persist across reload, graceful error without service worker                                                                                                                                           |
| `pwa.spec.ts`                  | Manifest, icons and theme-color served                                                                                                                                                                                                             |
| `race-continuity.spec.ts`      | Recovery plan after passed race, next goal card leads to future race plan                                                                                                                                                                          |
| `race-edit.spec.ts`            | Edit race name and goal, regenerate after date change, slower goal time changes plan paces                                                                                                                                                         |
| `raceday.spec.ts`              | Race day chip to pace plan and checklist, RACE workout to strategy                                                                                                                                                                                 |
| `races.spec.ts`                | Add, edit, delete race, goal race selection, delete blocked for active plan target                                                                                                                                                                 |
| `readiness-assessment.spec.ts` | Tired plus quality workout swap suggestion, fresh athlete no suggestion, weather banner priority                                                                                                                                                   |
| `readiness.spec.ts`            | Readiness card levels, hidden without health mock, settings toggle persists                                                                                                                                                                        |
| `realign.spec.ts`              | Realign missed workouts to SKIPPED and keep plan in weeks                                                                                                                                                                                          |
| `recovery.spec.ts`             | Post-race recovery plan with two weeks of easy and mobility workouts                                                                                                                                                                               |
| `reschedule-manual.spec.ts`    | Manual move to a free day persists, adapt week skips missed and keeps the rest                                                                                                                                                                     |
| `reschedule.spec.ts`           | Rain reschedule suggestion applies and survives reload, light rain no suggestion                                                                                                                                                                   |
| `responsive.spec.ts`           | No horizontal overflow on all pages and sizes, onboarding at 320px                                                                                                                                                                                 |
| `scroll.spec.ts`               | Navigation always starts at the top                                                                                                                                                                                                                |
| `settings.spec.ts`             | Settings index to subpages, active tab, back navigation                                                                                                                                                                                            |
| `skeleton-pages.spec.ts`       | Plan, Stats and Leaderboard skeletons without layout shift                                                                                                                                                                                         |
| `skeleton-settings.spec.ts`    | Gear and profile skeletons                                                                                                                                                                                                                         |
| `skeletons.spec.ts`            | Weather hero skeleton, Today skeleton without console errors                                                                                                                                                                                       |
| `social.spec.ts`               | Request, accept, feed, kudos toggle off, block, empty feed; decline then re-request and remove friend clears feed                                                                                                                                  |
| `splash.spec.ts`               | Splash shows and hides, static under reduced motion                                                                                                                                                                                                |
| `srpe.spec.ts`                 | Load card insufficient data, one hard workout fills acute load                                                                                                                                                                                     |
| `tcx.spec.ts`                  | TCX export of an interval workout with steps and pace targets                                                                                                                                                                                      |
| `theme.spec.ts`                | System dark default, system light, settings toggle persists, live OS follow, overflow in light theme                                                                                                                                               |
| `username.spec.ts`             | Username save, search, duplicate rejection, validation and margins                                                                                                                                                                                 |
| `weather-focus.spec.ts`        | Weather hero best window, plan calendar condition scores, hero hides on forecast failure                                                                                                                                                           |
| `why.spec.ts`                  | Why-this-workout guide on the TEMPO page                                                                                                                                                                                                           |

## New in this wave (13 tests)

`onboarding-variants.spec.ts` (new):

1. No race: base plan has no quality workouts, no race row, null anchor and paces.
2. Recent race only: anchor is the recent result, pace set is generated, race row keeps a null goal time.
3. 10K race: distance and goal time are stored on the race and the plan anchors to the goal.
4. Experienced with gt60 volume: profile and plan both keep experience and volume band.

`today-deep.spec.ts` (new):

5. Log modal depth: RPE slider, notes and pace reach the workout page logged card, recent activity and the database row.
6. Week board: km and done sessions progress after logging, and survive a reload.

`plan-deep.spec.ts` (new):

7. Calendar: a day with a workout opens that workout, next month and back-to-today navigation work.
8. Base plan from settings: clearing the goal time asks for confirmation, cancelling does nothing, confirming stores a plan with null anchor and paces and no quality workouts.

Extensions:

9. `account.spec.ts`: export after a run contains the log with RPE, computed pace and notes.
10. `app.spec.ts`: unknown route renders 404, and a wrong password shows the login error without leaving the page.
11. `social.spec.ts`: declined request can be sent again, removing a friend empties the friends list and the feed.
12. `premium.spec.ts`: a free user sees no target race select in the plan form and keeps the current plan race after regeneration.
13. `race-edit.spec.ts`: a slower goal time after regeneration produces a slower plan threshold pace.

## Previously listed gaps, now resolved (wave 10)

- Log editing exists; `today-deep.spec.ts` edits distance, duration, RPE and notes and asserts card and database state. A pain field is still not part of the modal.
- Guided run mute persists across reload via `localStorage`; `guided-audio.spec.ts` asserts the stored flag and the restored toggle.
- Gear rename is supported; `gear.spec.ts` renames a shoe and asserts persistence after reload.
- The race edit form shows a pace hint after a goal time change; `race-edit.spec.ts` asserts it appears and mentions plan regeneration.

## Known gaps left intentionally

- Premium purchase is not implemented, the dialog announces it as coming soon.
- Native Capacitor flows (push subscription on device, Health Connect) are not reachable in the browser; web fallbacks are covered.
- Feed pagination beyond the first 20 items and multi-user concurrency are out of scope.

## Running

```bash
cd app
PLAYWRIGHT_OUTPUT_DIR=/tmp/pw-e2e npx playwright test
```

CI runs the same suite after `supabase start` and `supabase db reset` in `.github/workflows/ci.yml`.
