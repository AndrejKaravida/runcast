# 05 — Quality, CI/CD & deploy audit (RunCast)

Repo: `/Users/andrejkaravida/Desktop/runcast`. Audit only; no source files changed. Research checked against GitHub docs (context availability), PostgreSQL docs (pg_dump version policy), Supabase docs (pooler modes, setup-cli v3) on 2026-10-12.

## Summary

- `ci.yml` is correct: `npm ci` at the repo root works (lockfile v3 contains `app` + `packages/shared` workspace entries), `cache: npm` is valid, and the `VITE_*` dummies are fine — Vite substitutes them at build time and `createClient` is never executed by `vite build`. CI Node 24 matches local v24.9.0.
- P1 bugs: keepalive ping step never runs (`secrets` is not a valid context in step `if`); backup can abort (`postgresql-client-16` on ubuntu-latest vs Supabase PG17) and its connection-string guidance is ambiguous; plan regeneration leaves ghost workouts (only `plans.status` is flipped); E2E misses core flows.
- Deploy: CF Pages monorepo settings are nearly right; `_redirects` exists; `_headers` missing.
- Code splitting with React Router 8 `lazy` is low-risk and expected to cut initial JS notably (Vite 8 = Rolldown; dynamic imports split automatically).
- `.gitignore` is safe — `git check-ignore -v app/.env.local` → `.gitignore:4`; only placeholder `.env.example` exists; `config.toml` uses `env()` substitutions. No secret leaks found.

## Findings table

| File                                             | Issue                                                                                                                                                                     | P   | Concrete fix                                                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/keepalive.yml:13`             | `secrets.*` used in step `if`; context table for `steps.if` excludes `secrets` → step silently skipped, job always green. Also `curl` without `--fail` exits 0 on 4xx/5xx | P1  | job-level `env:` + `if: env.SUPABASE_URL != ''`; `curl --fail-with-body -sS`; assert body `[]` (see checklist)                                                         |
| `.github/workflows/backup.yml:17`                | ubuntu-24.04 ships `postgresql-client-16`; server is PG17 (`supabase/config.toml:41`) → pg_dump refuses (`aborting because of server version mismatch`)                   | P1  | install `postgresql-client-17` from PGDG; log `pg_dump --version` (patch below)                                                                                        |
| `PLAN.md:79`                                     | `SUPABASE_DB_URL` unqualified: direct `db.<ref>.supabase.co` is IPv6-only (GH runners IPv4-only → unreachable); transaction pooler `:6543` unsupported for pg_dump        | P1  | document session pooler `aws-0-<region>.pooler.supabase.com:5432` (user `postgres.<ref>`, `?sslmode=require`)                                                          |
| `app/src/features/plans/queries.ts:40-58, 85-90` | Regeneration archives the plan but never removes its workouts; range queries filter only `user_id`+dates → duplicate dates/ghost workouts on Today/Plan/Stats             | P1  | delete workouts of archived plan(s) after archive (run_logs keep history via `on delete set null`), or filter queries by active `plan_id`; regression spec in E2E list |
| `app/e2e/app.spec.ts`                            | Only 3 happy-path specs; validation, settings, workout detail, skip, regeneration untested; text/`<p>`-coupled selectors                                                  | P1  | add specs 1–9 below; add `data-testid` hooks to Today/banner                                                                                                           |
| `app/public/_headers`                            | Missing → no `X-Content-Type-Options`/`Referrer-Policy`/`Permissions-Policy` on Pages                                                                                     | P2  | add file (exact content below)                                                                                                                                         |
| `app/playwright.config.ts:18`                    | `reuseExistingServer: true` always; no CI retries/html report; `route` mocks fail open to live network if URLs change                                                     | P2  | `reuseExistingServer: !process.env.CI`, `retries: CI ? 2 : 0`, html reporter; assert mocked route was hit                                                              |
| `app/src/router.tsx`                             | 11 eager page imports → single 742 KB / 212 KB gzip chunk                                                                                                                 | P2  | route-level `lazy()` (sketch below)                                                                                                                                    |
| `.github/workflows/ci.yml`                       | No e2e job, no `prettier --check`, no `permissions`/`concurrency`; app build re-runs `tsc`                                                                                | P2  | optional e2e job (feasible, sketch below); add format check + concurrency; drop `tsc` from app build or accept duplicate                                               |
| `PLAN.md:74-77`                                  | CF Pages monorepo settings not explicit (root must stay repo root)                                                                                                        | P2  | root `/`, install `npm ci` (default), build `npm run build -w app`, output `app/dist`, `NODE_VERSION=24`; previews use prod Supabase — accept or separate project      |
| `.nvmrc`, `package.json`                         | No Node pin; CI 24 == local 24 today only by luck                                                                                                                         | P2  | `.nvmrc` = `24`; root `engines.node: ">=24"`                                                                                                                           |
| `app/src/styles/theme.css`                       | No `prefers-reduced-motion` handling; `animate-spin/pulse`, `transition-*` always on                                                                                      | P2  | add reduced-motion media query; spec with `reducedMotion: 'reduce'`                                                                                                    |
| `supabase/config.toml:183`                       | `minimum_password_length = 6` vs UI zod min 8                                                                                                                             | P2  | align to 8 or document                                                                                                                                                 |
| `app/public/_redirects`                          | SPA fallback `/* /index.html 200` present and correct; copied to `app/dist`                                                                                               | OK  | keep                                                                                                                                                                   |
| `.gitignore`                                     | `.env`, `.env.local`, `.env.*.local`, `supabase/.temp/`, reports ignored; no tracked secrets                                                                              | OK  | keep; no change                                                                                                                                                        |

## E2E missing specs list

1. Register validation: empty submit shows all 4 zod messages (`Ime ima najmanje 2 znaka`, `Unesi ispravan email`, `Lozinka ima najmanje 8 znakova`, `Lozinke se ne poklapaju`); mismatched password.
2. Register server error (stub `**/auth/v1/signup` 422 via `page.route`) shows `authErrorMessage`; confirmation-sent screen (`Proveri svoj email`) when response has no session.
3. Onboarding validation: step 0 missing date (`Izaberi datum trke`) and past date (`Datum trke mora biti u budućnosti`); step 1 malformed goal time (`Ciljno vreme unesi kao h:mm:ss (npr. 3:45:00)`); step 4 city not picked (`Izaberi grad iz rezultata pretrage`).
4. Workout detail page: open `/workout/:id` from Plan map link; assert `Koraci`, step rows with pace, weather card `Vreme za termin 06–09 h` (mock forecast), `Urađeno` + `Preskoči` actions.
5. Skip flow: `Preskoči` → badge `Preskočeno`, WeekStrip X marker, survives `page.reload()`.
6. Settings profile save: edit `Ime` (and city), `Sačuvaj profil` → `Profil je sačuvan.`; reload shows persisted value.
7. Plan regeneration: Settings → `Generiši novi plan` → future date → `Generiši` → `Novi plan je generisan. Stari je arhiviran.`; Plan calendar has exactly one workout per date and no ghost mixed-plan workouts (would currently fail — see P1).
8. Reduced motion: `test.use({ reducedMotion: 'reduce' })`; login → Today renders (loader, countdown, weather) without errors.
9. Forgot password submit: valid email → `Link je poslat`; invalid → `Unesi ispravan email`. Swap-persistence is already covered (`app.spec.ts:148-160`); extend to assert WeekStrip/Plan consistency.

Selector fragility if Today is redesigned (current coupling): `getByText(/dana do trke/)` (CountdownCard), `getByText('E2E maraton')`, `getByText(/^Dugi trk/)` and `locator('p').filter(...)` (title must stay a `<p>`; `app.spec.ts:91,135-159`), `getByRole('button', { name: /Urađeno/ })` + exact badge `Urađeno` (`:93,98`), `getByText(/Kiša — 90% šanse/)` (copy from `weather-utils.tsx:42`), `getByRole('button', { name: /Prebaci na/ })` (copy from `RainAdjustmentBanner.tsx:57`), `a[aria-label*="Dugi trk"]` (PlanPage aria-label). Prefer `data-testid="today-workout-title"`, `today-status-badge`, `log-done`, `rain-banner`, `swap-button`.

## Ordered implementation checklist

1. **Fix keepalive (P1).** Acceptance: `workflow_dispatch` run executes ping, logs `[]`, exits 0; wrong key exits non-zero.

```yaml
name: Keep Supabase project alive

on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    steps:
      - name: Ping database through REST
        if: env.SUPABASE_URL != ''
        run: |
          body=$(curl -sS --fail-with-body "$SUPABASE_URL/rest/v1/profiles?select=id&limit=1" \
            -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY")
          echo "response: $body"
          test "$body" = "[]"
```

Confirmed: RLS `profiles_select_own` (`supabase/migrations/0001_init.sql:122`) returns 0 rows to anon with HTTP 200 `[]`, but PostgREST still executes SQL → counts as DB activity. Keep REST; `/auth/v1/health` is a weaker guarantee than an actual query.

2. **Fix backup (P1).** Acceptance: manual dispatch produces `runcast-backup.dump`, `pg_restore -l` lists tables; run fails if dump empty. Patch `backup.yml`: install client 17, `--schema=public` (app data; `auth` users are NOT included — document that limitation), `-Fc` (compressed custom format, restore with pg_restore), `test -s`; upload `runcast-backup.dump`.

```yaml
- name: Install postgres client 17
  if: steps.check.outputs.ready == 'true'
  run: |
    sudo curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/pgdg.gpg
    sudo sh -c 'echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    sudo apt-get update && sudo apt-get install -y postgresql-client-17
- name: Dump database
  if: steps.check.outputs.ready == 'true'
  run: |
    pg_dump --version
    pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner --no-privileges -Fc -f runcast-backup.dump
    test -s runcast-backup.dump
  env:
    SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
```

3. **Document `SUPABASE_DB_URL` (P1)** in PLAN.md: use the session pooler string `postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require`; never the direct host (IPv6) and never `:6543`.
4. **Fix regeneration ghosts (P1).** Acceptance: after `Generiši novi plan`, each date has exactly one workout; old plan's workouts are gone from Today/Plan/Stats; `run_logs` history intact.
5. **Add `app/public/_headers` (P2).** Acceptance: file present in `app/dist` after build, deployed responses show all three headers. Exact content:

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), geolocation=(), microphone=()
```

6. **Add E2E specs 1–9 (P1 for 4/5/6/7, P2 rest)** + `data-testid` hooks; harden `playwright.config.ts` (`reuseExistingServer: !process.env.CI`, `retries`, html reporter).
7. **Route-level code splitting (P2).** Start from `app/src/router.tsx` (data router already used), keep guards/TabLayout eager:

```tsx
{ path: '/today', lazy: async () => ({ Component: (await import('@/pages/TodayPage')).TodayPage }) },
```

Apply to all 11 pages (auth pages can stay with `RedirectIfAuthed`). Expected: initial entry ≈ 480–560 KB min / ≈150–175 KB gzip (from 742/212; vendor + shell stays), each route chunk ~20–80 KB; crypto-safe, no config change needed (Vite 8 Rolldown splits dynamic imports; do not use removed object-form `manualChunks`). Acceptance: `app/dist/assets/index-*.js` < 550 KB min, route chunks emitted, E2E still green. 8. **Tooling pins (P2).** `.nvmrc` = `24`; root `engines.node: ">=24"`; CF Pages `NODE_VERSION=24`. 9. **Optional E2E job in CI (P2).** Feasible on ubuntu-latest: `supabase/setup-cli@v3` (auto-uses root lockfile's `supabase` devDep), Docker preinstalled, `supabase start` (~4–8 min first pull), write `app/.env.local` from `supabase status -o json` (confirmations are disabled locally), then Playwright chromium. If kept local-only: state that in PLAN.md and route PRs through the local `npm run test:e2e -w app`.

```yaml
e2e:
  runs-on: ubuntu-latest
  timeout-minutes: 25
  needs: checks
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 24, cache: npm }
    - run: npm ci
    - uses: supabase/setup-cli@v3
    - run: supabase start
    - run: |
        supabase status -o json > status.json
        jq -r '"VITE_SUPABASE_URL=\(.API_URL)"' status.json > app/.env.local
        jq -r '"VITE_SUPABASE_ANON_KEY=\(.ANON_KEY)"' status.json >> app/.env.local
    - run: npx playwright install --with-deps chromium
    - run: npm run test:e2e -w app
    - if: failure()
      uses: actions/upload-artifact@v4
      with: { name: playwright-report, path: app/playwright-report, retention-days: 7 }
```

10. **CI hygiene (P2):** add `npx prettier --check .`, `permissions: contents: read`, `concurrency` group; optionally share one `tsc` run.
11. **Reduced motion (P2):** spec per list item 8; app-side `@media (prefers-reduced-motion: reduce)` rule disabling animation/transition in `theme.css` (proposal only during this audit).

## Out of scope

- Product features (Google login, notifications, Resend SMTP, mobile app).
- CSP header (needs Supabase/Open-Meteo `connect-src` allowlist and a nonce story).
- Renaming `app.spec.ts` into multiple files (nice-to-have once specs 1–9 land).
- Restoring/verifying backups (`pg_restore` drill) and storage-object backups.
- Migrations to paid tiers / IPv4 add-on; optional `auth` schema dump semantics.
