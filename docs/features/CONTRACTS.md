# Feature contracts — Runna-inspired v1.1 (obavezno za sve feature agente)

Svaki feature ima jednog vlasnika-agenta koji prolazi kroz faze: istraživanje → plan → arhitektura
(docs/features/NN-ime/) → implementacija → testovi. Ovaj fajl definiše zajedničke odluke da se
feature-i ne sudare.

## 5 feature-a i vlasništvo fajlova

| #   | Feature                        | Smi-je da dira                                                                                                                                                                                                                                                                              |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F2  | Snaga & mobilnost u planu      | `packages/shared/src/{strength.ts,strength.test.ts,types.ts,plan-generator.ts,plan-generator.test.ts,index.ts}`, `supabase/migrations/<nova>`, `app/src/pages/{PlanPage,WorkoutPage,TodayPage}.tsx` (samo strength grane), `app/e2e/app.spec.ts` (samo neophodne izmene postojećih testova) |
| F1  | Vođeno trčanje (guided run)    | `packages/shared/src/{guided.ts,guided.test.ts,index.ts}`, `app/src/pages/GuidedRunPage.tsx` (nov), `app/src/components/guided/*` (nov), `app/src/router.tsx`, `app/src/pages/{TodayPage,WorkoutPage}.tsx` (dugmad), `app/e2e/guided.spec.ts` (nov)                                         |
| F5  | „Zašto ovaj trening" vodič     | `packages/shared/src/{explain.ts,explain.test.ts,index.ts}`, `app/src/components/workouts/WhyCard.tsx` (nov), `app/src/pages/WorkoutPage.tsx` (sekcija)                                                                                                                                     |
| F3  | Prediktor trke + lični rekordi | `packages/shared/src/{predict.ts,predict.test.ts,index.ts}`, `app/src/components/workouts/{PredictorCard,PersonalBestsCard}.tsx` (nov), `app/src/pages/StatsPage.tsx`, `app/src/pages/OnboardingPage.tsx` (samo feasibility hint)                                                           |
| F4  | Adaptivni trener               | `packages/shared/src/{coach.ts,coach.test.ts,index.ts}`, `app/src/components/workouts/CoachInsightsCard.tsx` (nov), `app/src/pages/StatsPage.tsx`, `app/src/features/plans/queries.ts` (samo nova mutacija za skaliranje nedelje)                                                           |

Redosled implementacije je F2 → F1 → F5 → F3 → F4 (sekvencijalno; nema paralelnih izmena).

## Shared paket (zajednička pravila)

- `WorkoutType` unija dobija **`'STRENGTH'`** (samo to; F2 je vlasnik izmene).
- Strength workout: `type: 'STRENGTH'`, `distanceKm: 0`, `durationSec > 0`, `paceZone: null`,
  `steps` = vežbe: `[{ label: 'Čučnjevi — 3×12', durationSec: 90 }, …]` (setovi/reps idu u label).
- Svi novi moduli su **pure TS** (bez DOM/fetch zavisnosti), izvoze se iz `index.ts`, imaju vitest
  testove u istom folderu. Bez komentara u kodu. Srpski UI stringovi.
- Postojeće funkcije se proširuju, ne dupliraju (npr. `isRunWorkout` u app-u već izuzima STRENGTH —
  proveriti da novi kod poštuje to).

## Baza

- **Tačno jedna nova migracija** (vlasnik F2): menja check constraint `workouts.type` da uključi
  `'STRENGTH'`. Kreirati preko `npx supabase migration new <ime>` (ime fajla = verzija, obavezno za
  GitHub auto-migracije!). Lokalno primeniti sa `npx supabase migration up`. Bez novih tabela i RPC-ova.
- Napomena: migracija ide na prod automatski na push (Supabase GitHub integracija) — F2 u docs
  napominje mali race-window (deploy app-a pre migracije) kao prihvaćen rizik.

## App

- Nove rute: **`/run/:id`** (F1, guided runner). Ostalo unutar postojećih strana.
- UI: koristiti postojeće primitive (`AppCard`, `AppButton`, `AppBadge`, `ProgressRing`,
  `EmptyState`, `QueryError`, `ConfirmDialog`) i `useTapProps` za press; Tailwind utilities
  (BEM samo ako utilities ne mogu). Reduced-motion poštovati (globalni CSS već pokriva tranzicije;
  Motion elemente gate-ovati preko `useReducedMotion` gde je bitno).
- Logovanje: run workout → postojeći `LogWorkoutModal`; **STRENGTH → dugme „Završi trening"**
  markira DONE bez `run_log`-a (bez distance/RPE forme).
- Nove stranice moraju biti responsive (testirano na 320px; bez horizontalnog overflow-a).

## E2E stabilnost (kritično)

Postojeći `app/e2e/app.spec.ts` i `app/e2e/responsive.spec.ts` MORAJU da prolaze. Pravila:

- Run treninzi ostaju na **istim danima** kao pre — strength zamenjuje isključivo REST dane.
  (daysPerWeek 4, longRunDay 0: run = pon/сре/čet/pet, strength = uto + sub, ostaje ned REST.)
- Plan-generator unit testovi: brojanja „non-REST" moraju se ažurirati da broje samo run tipove ili
  eksplicitno uključe strength — ažurira ih vlasnik F2 i to je jedina dozvoljena izmena postojećih
  plan testova.
- E2E zavisnosti koje se ne smeju slomiti: `/today` hero title `<p>`, `Urađeno` dugme i badge,
  `Ova nedelja` (Plan) sa 7 `week-row`, Stats: `Realizacija`, `Poslednje zabeleženo`, `50:00`,
  rain banner `Kiša — 90% šanse` + `Prebaci na` (swap ne sme dirati STRENGTH),
  `a[aria-label*="Dugi trk"]`, onboarding `VDOT 4…` preview.
- Guided runner E2E mora biti deterministički: podržati `?timeScale=<N>` (ubrzanje tajmera) kao
  test/demo hook.

## Kvalitet — obavezni koraci posle implementacije

1. `npm run typecheck` (root — pokriva shared + app)
2. `npm run test` (shared, svi vitest testovi zeleni)
3. `npm run lint -w app` (0 error; postojeći react-refresh warning je OK)
4. `cd app && npx playwright test` (svi E2E; traži da lokalni `supabase start` + dev server rade)
5. Ako dodaješ E2E: ime fajla `app/e2e/<feature>.spec.ts`.

Bez novih npm dependency-ja (Web Audio / Speech Synthesis / Wake Lock su browser API-ji).

## CI: E2E job

- `e2e` job u `.github/workflows/ci.yml` (posle `checks` i `migrations`) pokreće ceo Playwright suite na ubuntu-latest: `supabase start`, `app/.env.local` iz `supabase status -o json` (`API_URL` + `ANON_KEY`), chromium, `npx playwright test` sa `CI=true`.
- Artefakti samo na pad: `playwright-report` (HTML) + `app/test-results` (trace), 7 dana.
- Lokalno kao CI: `cd app && CI=true npx playwright test` (port 5173 mora biti slobodan jer dev server diže sam test; retries 1, trace samo na prvom retry-ju, bez trace-a na uspeh).
- Paralelni lokalni runovi: `PLAYWRIGHT_OUTPUT_DIR=/tmp/pw-run npx playwright test` u `app/` da se `test-results` artefakti ne sudaraju.
