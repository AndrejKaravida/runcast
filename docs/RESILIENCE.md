# Resilience

What protects the app from white screens, endless spinners and silent mutation failures.

## Route error boundary

`components/layout/ErrorScreen.tsx` renders friendly copy, a `Pokušaj ponovo` button (full reload) and a link back to `/today`. It is wired as `errorElement` in `router.tsx` on:

- the root route (covers public pages, login, register, onboarding and any unmatched child),
- the `TabLayout` route (today, plan, stats, settings),
- the `RequireOnboarding` route (standalone pages: workout, guided run, race day, benchmark, leaderboard, friends).

Any render error or lazy-route load failure below those routes shows the screen instead of a white page.

Lazy chunk failures are detected in `isChunkLoadError` by matching browser error text (`Failed to fetch dynamically imported module`, `Importing a module script failed`, Firefox `error loading dynamically imported module`). Those show the distinct message `Nova verzija je dostupna, osveži stranicu` with the same reload action, because the usual cause is a deployed update that replaced hashed chunks.

## Guard fail-safe

- `RequireAuth`: the splash is shown only while the session is loading. If `supabase.auth.getSession()` rejects, `AuthProvider` resolves the session as signed out, so the guard redirects to `/login` instead of hanging on the loader forever.
- `RequireOnboarding`: the splash is shown only for `isLoading`. On query error it renders the existing `QueryError` screen with retry (`Pokušaj ponovo`), never an endless splash.

## Mutation feedback inventory

Every user-triggered mutation surfaces either inline error text or a dialog error. Pattern: local `error` state, `role="alert"`, danger tokens, no toast system.

| Mutation                                                                                              | Trigger                    | Feedback                                                                                            |
| ----------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| `useUpdateProfile`                                                                                    | Onboarding finish          | `errors.profileSaveFailed` inline, navigation stops                                                 |
| `useUpdateProfile`                                                                                    | Settings profile save      | `errors.saveFailed` / `usernameTaken` inline                                                        |
| `useGeneratePlan`                                                                                     | Onboarding / Settings plan | `errors.generateFailed` / `plan.generateFailed` inline                                              |
| `useGenerateRecoveryPlan`                                                                             | Plan / Race day            | `recovery.error` inline                                                                             |
| `useUpdateRace`, `useAddRace`, `useSetPlanRace`, `useDeleteRace`                                      | Settings plan              | `plan.raceEditFailed`, `races.addFailed`, `races.setGoalFailed`, dialog error                       |
| `useApplyWeekPlan`                                                                                    | Plan adapt / realign       | `adapt.error` inline or `realign.error` notice                                                      |
| `useSwapWorkouts`                                                                                     | Today swap                 | `verdict.swapError` inline                                                                          |
| `useMoveWorkout`                                                                                      | Workout move dialog        | `workout:move.error` inline                                                                         |
| `useRecalibratePlan`                                                                                  | Benchmark suggestion       | `suggestion.error` inline                                                                           |
| `useScaleWeek`                                                                                        | Coach insight action       | `coach.applyFailed` inline                                                                          |
| `useLogWorkout`                                                                                       | Log modal                  | `log.errorSave` inline                                                                              |
| `useSkipWorkout`                                                                                      | Workout skip dialog        | `workout:skip.error` in dialog                                                                      |
| `useCompleteWorkout`                                                                                  | Today / Workout            | `actions.completeError` / `actions.error` inline                                                    |
| `useSaveBenchmarkLog`                                                                                 | Benchmark result           | `result.errorSave` inline                                                                           |
| `useImportHealthRuns`                                                                                 | Settings health import     | `integrations.importFailed` inline                                                                  |
| `useUploadAvatar`                                                                                     | Settings profile avatar    | `avatarUploadFailed` inline                                                                         |
| `useAddShoe`, `useUpdateShoe`, `useDeleteShoe`                                                        | Settings gear              | `gear.saveFailed` / `gear.deleteFailed` inline                                                      |
| `useSavePushSubscription`, `useUpdatePushPreferences`, `useDeletePushSubscription`, `useSendTestPush` | Settings notifications     | `push.*` inline notice or error                                                                     |
| `useSendFriendRequest`                                                                                | Friends add                | `add.errors.*` inline                                                                               |
| `useRespondRequest`                                                                                   | Friends accept / decline   | `requests.respondFailed` inline                                                                     |
| `useRemoveFriend`, `useBlockUser`                                                                     | Friends dialogs            | `friends.actionFailed` in dialog, dialog stays open                                                 |
| `useKudos`                                                                                            | Friends feed               | `feed.kudosError` inline, optimistic update rolls back                                              |
| `useDeleteAccount`                                                                                    | Settings account           | `account.deleteFailed` in dialog                                                                    |
| `useExportPlanIcs`                                                                                    | Settings plan export       | `plan.exportFailed` inline                                                                          |
| `useExportWorkoutTcx`, `useExportWorkoutFit`                                                          | Workout / guided export    | Fire-and-forget local file build, no network call. Accepted risk, failures surface only in console. |
| `useHealthAutoImport`                                                                                 | Background autosync        | Deliberately silent; failures are retried on next resume or manual import.                          |

## Global rejection safety net

`lib/error-reporting.ts` adds a single `unhandledrejection` listener, installed from `main.tsx`. It calls `preventDefault()` only for known-benign aborts (`AbortError` plus messages containing `aborted`), which is how React Query query cancellations and aborted Supabase fetches surface, and those would otherwise spam the console on navigation. Any other rejection keeps default browser behavior. No telemetry, no third-party reporting.

## E2E coverage

`e2e/error-boundary.spec.ts` covers both failure classes:

- Chunk failure: the dev server serves source modules, so the spec aborts `**/src/pages/LicensesPage.tsx*` and asserts the version message and reload button. Production builds fail the same way through hashed asset names (`WorkoutPage-*.js`), which the same detector handles.
- Guard failure: aborts `**/rest/v1/profiles*` with a 500 on `/today`, asserts the retry screen appears instead of a stuck splash, then removes the route and retries to confirm recovery.
