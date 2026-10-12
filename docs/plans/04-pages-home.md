# 04 — Page audit & RunCast home (Danas) dashboard

Read-only audit of all pages/UX (2026-10-12) and widget research for the v1.1 home screen. No app files were modified.
Analytics-free verified: no tracking lib/call exists in `app/src` — keep it that way.

## Page audit findings

| Page                  | Issue                                                                                                                   | Pri | Fix                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------ |
| Global (authed)       | Query errors render as empty states ("Nema aktivnog plana") or blank; no error/retry UI anywhere                        | P0  | `QueryError` block on Today/Plan/Stats/Settings; never show "no plan" on error |
| Global                | Tabs active state color-only; `size="sm"` buttons are 36px; skeletons inconsistent                                      | P2  | `aria-current`, 44px min targets on primary actions, reuse `Skeleton`          |
| Today                 | Base plan (no race) shows "Ciljna trka" countdown to synthetic `race_date` (start + 8 weeks)                            | P0  | When `races == null` show "Nedelja X/Y plana · faza" instead of countdown      |
| Today                 | Race in past: "Vreme je za novi plan" is a dead end (no CTA)                                                            | P1  | Button → `/settings` regenerate                                                |
| Today                 | Countdown + rain banner push "what do I run today" toward/below fold on 375×667                                         | P0  | Workout hero first; countdown as compact chip row                              |
| Today                 | Verdict banner duplicates hourly weather card; dismissing loses the verdict                                             | P1  | Inline verdict in hero; keep hourly card below                                 |
| Today                 | No weekly progress / adherence ("am I on track")                                                                        | P1  | Week board: done/planned km + sessions                                         |
| Today                 | REST day leaves only the weather card                                                                                   | P2  | "Next workout" teaser row                                                      |
| Today                 | Primary "Urađeno" uses `size="sm"` (36px)                                                                               | P2  | `md` for hero actions                                                          |
| Plan                  | No way back to today after month browsing; footer list always "Ova nedelja" even when viewing another month             | P1  | "Danas" reset button; footer list follows visible month/week                   |
| Plan                  | No dot-color legend; no plan/phase header                                                                               | P2  | Legend + phase chip                                                            |
| Workout               | "Preskoči" is one tap, no confirm/undo (destructive)                                                                    | P1  | Confirm dialog or toast with undo                                              |
| Workout               | Weather card rendered for past workout dates                                                                            | P2  | Hide when `workout_date < today`                                               |
| Workout               | DONE workout hides logged data (RPE, duration, notes); log not editable/deletable                                       | P2  | Show log summary + delete action                                               |
| Workout               | `navigate(-1)` leaves the app on deep links; not-found state lacks CTA                                                  | P2  | Back link to `/plan`                                                           |
| Stats                 | Weekly chart includes future planned weeks as if run; `doneKm` uses planned `workouts.distance_km`, not logged distance | P0  | Chart only weeks up to current; prefer `run_logs.distance_km`                  |
| Stats                 | Streak counts calendar days (REST breaks it) and is unitless                                                            | P2  | Run-day streak since last gap; add "d"                                         |
| Stats                 | Notes hidden; only 5 log rows                                                                                           | P2  | Expand rows; optional pace/RPE trend (P2)                                      |
| Settings              | Regenerate defaults distance to 42.195 and can silently produce a base plan (no goal/recent)                            | P1  | Prefill from current race/goal; base-plan warning + confirm                    |
| Settings              | Plan form duplicates onboarding logic                                                                                   | P2  | Extract shared `PlanForm`; no behavior change                                  |
| Onboarding            | VDOT preview mixes recent distance (e.g. 5 km) with goal time (3:45:00) → nonsense                                      | P0  | Compute only from a matched distance/time pair                                 |
| Onboarding            | Recent distance + empty time is silently ignored (no error, no anchor)                                                  | P1  | Validate pair both-or-none                                                     |
| Onboarding            | `parseTimeToSeconds` accepts `99:99:99` / `3:75:00` (no mm/ss range check)                                              | P1  | Range-check mm/ss < 60 in shared schema                                        |
| Onboarding            | goalTime regex allows only h:mm:ss while shared parser allows mm:ss; "99:99" passes regex                               | P2  | One shared time validator + clear message                                      |
| Onboarding/Settings   | Copy: "Dan dugog trka", "poslednjih mesec", Cyrillic "fazе"                                                             | P2  | "Dan dugog trčanja", "poslednjeg meseca", "faze"                               |
| Login                 | Password min 6 vs register min 8; no show/hide                                                                          | P2  | Align to 8; add reveal                                                         |
| Settings (CityPicker) | Typing a city without picking a suggestion keeps old lat/lon silently                                                   | P2  | Invalidate coords until a suggestion is picked                                 |

Overcomplicated: `OnboardingPage` (518 lines) and `SettingsPage` (379 lines) duplicate plan config/validation/refresh UI; `StatsPage`
computes progress/streak inline (move to `features/plans/progress.ts`); "Samo na otvaranje" button is visually detached from `SegmentedControl`.

## Data availability for widgets

Existing hooks: `useProfile`, `useActivePlan` (plan + `races(name)`), `useWorkoutsRange(from,to)`, `useWorkout`, `useRunLogs` (latest 300), `useWeather`.

| Widget data                         | Available now | Notes                                                                                 |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------------- |
| Days to race / plan week / phase    | yes           | `plan.race_date/start_date/weeks` + nearest `workouts.phase` + `dayDiff`              |
| Today workout + steps + pace zone   | yes           | week range, already on TodayPage                                                      |
| Weather verdict + hourly run window | yes           | `useWeather` + `assessWorkoutWeather`                                                 |
| Next-day weather (when today REST)  | yes           | forecast covers ~9 days, filter by window                                             |
| Week done/planned km, sessions      | yes           | sum week range client-side, no new query                                              |
| Plan adherence %                    | yes           | range `plan.start_date → min(today, race_date)`; ≤ ~26×6 = 156 rows, client-side fine |
| Streak                              | yes           | same range; extract Stats logic                                                       |
| Next non-REST workout               | yes           | range scan for nearest date > today                                                   |
| Recent activity (pace, RPE, notes)  | yes           | `useRunLogs` slice 1–3                                                                |
| Actual vs planned distance          | yes           | `run_logs.workout_id` join with `workouts`                                            |
| Weekly sparkline (6–8 weeks)        | yes           | same range; reuse Stats chart                                                         |
| PRs per distance (reliable)         | no            | logs have one distance each, no standard buckets                                      |
| Training load / readiness           | no            | no HR/sleep data; duration × RPE proxy only                                           |
| Coach notes/tips                    | no            | no content source; can derive pace/weather insight client-side                        |
| Race-day weather                    | partial       | only within forecast horizon                                                          |
| Multiple/upcoming races             | no            | new `races` query (`races` table exists)                                              |

Per-week aggregation stays client-side: one `useWorkoutsRange(plan.start_date, plan.race_date)` covers a full plan; React Query caches it.

## Home dashboard proposal

Brief: open in the morning with coffee → glanceable: (1) what do I run today + is the weather OK, (2) am I on track this week, (3) how long to race.

| #   | Widget (order)              | Shows                                                                                                                              | Data mapping                                                                            | Pri |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --- |
| 1   | Today hero                  | type/title, distance, duration, key pace + first steps; inline weather verdict ("Kiša 90% — Prebaci na sre"); CTA Urađeno / Detalj | week range find `workout_date = today`; `assessWorkoutWeather` + `pickSwapCandidate`    | P0  |
| 2   | Race / plan chip row        | "42 dana do trke" (or "Nedelja 7/16 · BUILD" for base plan) + streak "5 d"                                                         | `dayDiff(today, plan.race_date)`, `plan.start_date/weeks`, nearest `phase`, streak util | P0  |
| 3   | Week board                  | "24/38 km · 3/4 treninga" + existing `WeekStrip`                                                                                   | week range sums (`distance_km`, status)                                                 | P0  |
| 4   | Weather card                | hourly in run window; next-day window when today REST/done                                                                         | `useWeather` + `runWindowHours`                                                         | P0  |
| 5   | Next workout teaser         | only when today REST/done: "Sutra · Lako trčanje 8 km"                                                                             | range scan next non-REST                                                                | P1  |
| 6   | Recent activity             | last 2 logs: date, km, pace, RPE                                                                                                   | `useRunLogs().slice(0, 2)`                                                              | P1  |
| 7   | Weekly sparkline (optional) | 6-week bars, planned vs done                                                                                                       | same range; reuse Stats chart                                                           | P2  |

Why this order — references:

- Today workout first: Runna's Today tab centers the day's workout + weekly mileage at a glance; Stride "open and your next workout is ready"; TrainAsONE daily rebuild; NRC run-first home.
- Race countdown + adherence: PaceWise home counts down to the next goal race and shows how the week is shaping before any tap; Stride keeps race countdown; Runna tracks goal/estimated times.
- Weekly progress: Garmin Connect "My Day" + In Focus weekly trends; Apple Fitness rings + Training Load; Runna weekly mileage; Strava weekly training-log bars and goal rings.
- Streak/consistency: NRC milestones/streak emphasis; Strava puts your own streak before the social feed.
- Recent activity: Garmin "Last activity" widget; Runna Progress workouts; Strava feed.
- Weather-driven adjustment remains RunCast's differentiator (researched apps treat weather as internal planning input, e.g. TrainAsONE "weather awareness").
- Deliberately not on home: social feed, training load/readiness (no HR/sleep), PRs (unreliable data), coach chat, heatmap.

## Ordered implementation checklist

1. Global query error state (P0) — Today/Plan/Stats/Settings show error + retry instead of "no plan". Accept: network failure never shows "Nema aktivnog plana". E2E: none directly.
2. Today hero restructure (P0) — workout card first, verdict inline. Accept: at 375×667 workout + verdict visible without scroll. E2E must survive: `Kiša — 90% šanse` text, buttons `/Urađeno/`, `/Prebaci na/`, and workout titles kept in `<p>` (`locator('p').filter({ hasText: /^Dugi trk/ })`) — renaming those or moving titles to headings breaks the rain test.
3. Countdown/plan chip, base-plan fix, past-race CTA (P0). Accept: race plans still render "dana do trke" + race name (E2E test 1 and re-login assertion depend); base plan shows plan week; past race has CTA. E2E breaks if countdown copy for race plans changes.
4. Week board with km/adherence (P0). Accept: sums match workouts, no new query. E2E: `Ova nedelja` on Plan (test 1) must stay; Today's header text is not asserted but keep consistent.
5. Weather card conditional + dedupe (P0). Accept: no forecast for past workouts; REST day shows next-day window; "Vreme: Open-Meteo" attribution kept.
6. Progress utils + Stats fixes (P0) — extract `features/plans/progress.ts`; exclude future weeks from chart; totals prefer `run_logs.distance_km` (fallback plan). Accept: logging 12 km against a 10 km plan shows 12. E2E: `Realizacija`, `Poslednje zabeleženo`, `50:00` must stay visible on Stats.
7. Onboarding fixes (P0/P1) — matched-pair VDOT preview; both-or-none recent race; shared time validator (mm/ss < 60). Accept: 5 km + empty time + goal 3:45:00 shows no VDOT; `99:99:99` rejected. E2E: `Ciljno vreme` 3:45:00 must still show `VDOT 4...` (test 1).
8. Settings regenerate prefill + warning + confirm (P1). Accept: form prefills current race/goal; base-plan downgrade warned and confirmed. E2E: `Generiši` flow untested; keep existing button/label names.
9. Workout page: skip confirm/undo, hide past weather, show log summary (P1). E2E: Today's `/Urađeno/` button unaffected; WorkoutPage has no E2E coverage.
10. PlanPage "Danas" reset + dot legend (P1). E2E must keep `a[aria-label*="Dugi trk"]` and `Ova nedelja` (test 1).
11. Next-workout teaser + recent activity (P1). E2E caution: rain test uses `.first()` on `/^Lako trčanje/` and asserts `/^Dugi trk/` hidden after swap — teaser must not render either title in a `<p>` (use "Sutra · ..." labels) or those assertions flip.
12. Copy/typos and a11y/tap targets (P2).
13. Weekly sparkline / PR exploration (P2, only after Stats dedupe ships).

## Out of scope (v1.1)

- Push/local notifications, Google login, i18n, miles/units conversion.
- GPS/run recording, wearable/HR sync, training load/readiness scores.
- Social feed, clubs, challenges, coach chat/content.
- Backend aggregation/RPC, new tables, PRs per distance, heatmap, multi-race planning.
- Analytics of any kind (keep analytics-free).
