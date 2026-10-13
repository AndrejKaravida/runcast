# Client and dependency security audit

Date: 2026-10-13. Scope: npm workspaces (`app`, `packages/shared`, root), git history and
tracked files for secrets, `app/src` client code, `app/public/_headers`. Backend and RLS
findings live in the separate `docs/SECURITY-AUDIT.md`.

Method: `npm audit --workspaces`, `git ls-files` / `git log --all -S` scans, source grep for
known client sinks, manual review of auth, storage, push and upload paths. All fixes were
verified with the full test suite (typecheck, 338 unit tests, lint, build, 89 Playwright tests,
Prettier).

Verdicts: `fixed` (changed in this audit), `ok` (verified, nothing to fix), `risk-accepted`
(known, deliberately unchanged, rationale given), `deferred` (recommended later, not changed now).

## Findings and actions

| ID       | Area           | Finding                                                                                                       | Verdict       |
| -------- | -------------- | ------------------------------------------------------------------------------------------------------------- | ------------- |
| DEP-1    | Dependencies   | `uuid@7.0.3` (GHSA-w5hq-g745-h8pq) via `xcode` via `@capacitor/cli`                                           | fixed         |
| DEP-2    | Dependencies   | `npm audit fix --force` would downgrade `@capacitor/cli` 8.5.3 to 8.4.3                                       | rejected      |
| DEP-3    | Dependencies   | Direct deps are current majors, no CVEs; zod 4 / TS 7 majors available                                        | risk-accepted |
| DEP-4    | Dependencies   | `glob@11.1.0` deprecation warning during install (nested under `workbox-build`)                               | risk-accepted |
| SEC-1    | Secrets        | `.gitignore` did not cover `.env.production`-style files, keystores, `google-services.json`                   | fixed         |
| SEC-2    | Secrets        | Keystores / `google-services.json` / p12 / pem / provisioning: none committed, none on disk                   | ok            |
| SEC-3    | Secrets        | `service_role`, `sb_secret`, JWT scan of full history: no real secrets                                        | ok            |
| SEC-4    | Secrets        | `app/.env.local` contains only URL and anon key, is ignored; `config.toml` uses `env()` substitution          | ok            |
| CLIENT-1 | XSS sinks      | No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `Function`, `document.write`, `srcdoc`, `postMessage`      | ok            |
| CLIENT-2 | External links | All `target="_blank"` links carry `rel="noopener noreferrer"`; `window.open` uses both flags                  | ok            |
| CLIENT-3 | Open redirect  | `push-sw.js` navigated to unvalidated push payload URL                                                        | fixed         |
| CLIENT-4 | Upload         | Avatar: client mime/size check plus canvas re-encode; bucket enforces 1 MiB and `image/jpeg`, per-user folder | ok            |
| CLIENT-5 | Storage        | localStorage holds UI preferences only; Supabase SDK owns the session keys                                    | ok            |
| CLIENT-6 | URL params     | `timeScale` clamped to numeric range; `race` used as boolean; no raw param rendering                          | ok            |
| HDR-1    | Headers        | `_headers` has nosniff, Referrer-Policy, Permissions-Policy, HSTS, X-Frame-Options, CSP                       | ok            |
| HDR-2    | Headers        | CSP hardening recommendations (worker-src, manifest-src, Trusted Types)                                       | deferred      |
| HDR-3    | Headers        | `_headers` only applies on Cloudflare Pages; `vercel.json` defines no headers                                 | risk-accepted |

## Dependencies

**DEP-1 (fixed).** `npm audit --workspaces` reported 3 moderate advisories, all one chain:
`uuid < 11.1.1` (buffer bounds check missing in v3/v5/v6 when `buf` is provided) through
`xcode >= 0.9.2` through `@capacitor/cli`. This is dev-only tooling: it runs during `cap sync`
on a developer machine or CI, it is not part of the web bundle, the Android or the iOS binary.
`xcode` only calls `uuid.v4()` without a buffer, so the vulnerable code path is unreachable.

Fixed with a scoped override in the root `package.json`:

```json
"overrides": { "xcode": { "uuid": "^11.1.1" } }
```

Verification: `uuid@11.1.1` still ships CommonJS (`require('uuid')` works for `xcode`), and a
smoke test parsed the real `app/ios/App/App.xcodeproj/project.pbxproj` with the overridden
version and generated a UUID. After the change `npm audit --workspaces` reports
0 vulnerabilities.

Two operational notes. First, npm 11.6.0 does not apply a new override to an existing workspace
lockfile; the lockfile had to be regenerated (`npm install` after removing `node_modules` and
`package-lock.json`). The resulting lockfile diff is `uuid` 7.0.3 to 11.1.1 plus patch/minor
bumps already inside declared ranges (rollup 4.64.6, typescript-eslint 8.71.2, motion 14.2.0,
lucide-react 1.56.0) and hoisting moves. Second, `npm ls uuid` prints
`invalid: "^7.0.3" from node_modules/xcode` because npm does not record workspace overrides in
lockfile edges. This is a cosmetic npm bug: `npm install` and `npm ci` are stable and
reproducible, and CI does not run `npm ls`.

**DEP-2 (rejected).** The only fix `npm audit` proposes is `--force`, which downgrades
`@capacitor/cli` from 8.5.3 to 8.4.3. A downgrade of the Capacitor toolchain is a breaking
change with no security benefit; rejected in favor of the scoped override.

**DEP-3 (risk-accepted).** Direct dependencies are on current majors: react 19.3,
react-router 8.4, `@supabase/supabase-js` 2.117, i18next 26.4, vite 8.3, Playwright 1.64,
Capacitor 8.5. `npm outdated` only suggests zod 4 and TypeScript 7 majors, neither carries an
advisory for the installed versions and both are intentionally not bumped.

**DEP-4 (risk-accepted).** npm prints a deprecation warning for `glob@11.1.0`, pulled in
nested under `workbox-build` (`vite-plugin-pwa`). The advisory that deprecated old glob
versions is already fixed in 11.1.0, which is why `npm audit` reports nothing. The nested pin
is upstream and not worth patching.

## Secrets hygiene

**SEC-1 (fixed).** `.gitignore` covered `.env`, `.env.local` and `.env.*.local`, which left
files like `.env.production` trackable, and it had no keystore or Google services rules. The
root `.gitignore` now has:

```
.env
.env.*
!.env.example
*.keystore
*.jks
google-services.json
GoogleService-Info.plist
```

Verified with `git check-ignore`: `app/.env.production`, `app/android/app/release.keystore`,
`app/android/app/google-services.json` and `app/ios/App/GoogleService-Info.plist` are ignored,
while `app/.env.example` stays trackable. The Capacitor template `app/android/.gitignore` keeps
its keystore and google-services lines commented out by default; the root rules now cover those
files regardless.

**SEC-2 (ok).** `git ls-files` contains no keystore, jks, p12, pem, provisioning profile or
google-services file. Nothing of the kind exists in `app/android` or `app/ios` on disk either,
so there is nothing to remove from history.

**SEC-3 (ok).** History scans: `service_role` appears once, in a comment inside
`supabase/config.toml`; `sb_secret` does not appear. `eyJ` (JWT prefix) matches are two benign
things: the standard Supabase local development demo anon JWT (`iss: supabase-demo`,
`role: anon`, published by Supabase for local stacks) used in the e2e specs, and an npm sha512
integrity hash that happens to contain `eyJ`. No production JWT, no service key, no personal
token.

**SEC-4 (ok).** `app/.env.local` exists on disk, is ignored, and defines only
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is public by design; row level
security is the trust boundary and is covered by the backend audit. `supabase/config.toml`
passes secrets through `env()` substitution and commits none.

## Client code

**CLIENT-1 (ok).** No HTML injection sinks exist in `app/src`: no
`dangerouslySetInnerHTML`, `innerHTML`, `insertAdjacentHTML`, `outerHTML`, `eval`,
`new Function`, `document.write`, `srcdoc`, `iframe` or `postMessage`. React escapes text by
default and react-i18next escapes interpolated values. Push notifications render title and
body through the Notification API, not HTML.

**CLIENT-2 (ok).** All five `target="_blank"` anchors (`WorkoutPage`, `LicensesPage` twice,
`WeatherHero`, `WeatherSummaryCard`) carry `rel="noopener noreferrer"`, and the single
`window.open` call in `lib/native.ts` passes `noopener,noreferrer`.

**CLIENT-3 (fixed).** `public/push-sw.js` previously navigated to
`event.notification.data.url` with no validation. The sender is our own edge function and
currently hardcodes `/today`, so this was not exploitable, but the service worker now accepts
only same-origin paths and falls back to `/` otherwise. The guard rejects both absolute URLs
and protocol-relative `//host` values.

**CLIENT-4 (ok).** Avatar upload has defense in depth. Client: `canUploadAvatar` requires an
`image/*` mime and at most 10 MB, then `resizeAvatar` decodes the bitmap and re-encodes a
512x512 JPEG, which neutralizes spoofed mime types and strips metadata. Server: the `avatars`
bucket has `file_size_limit = 1048576`, `allowed_mime_types = ['image/jpeg']`, and insert,
update, delete and select policies restrict every user to their own `auth.uid()` folder.

**CLIENT-5 (ok).** localStorage and sessionStorage hold UI state only: theme, language, fueling
toggle, race day checklist, achievements seen/pop state, health sync flags and readiness
history. No token or credential is written manually; the Supabase SDK persists the session in
its own `sb-*` keys. Account deletion removes `runcast.*` keys after `signOut`.

**CLIENT-6 (ok).** URL parameters are parsed, not rendered: `GuidedRunPage` clamps `timeScale`
to a numeric range, `SettingsPlanPage` reads `race` as a boolean flag. The download helper
creates blob URLs from in-memory exports only.

## Security headers

**HDR-1 (ok).** `app/public/_headers` applies to `/*` on Cloudflare Pages and contains
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), geolocation=(self), microphone=()`, HSTS with
`includeSubDomains`, `X-Frame-Options: DENY`, and a CSP. The CSP is already live and stricter
than the baseline planned for "later":

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self';
img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co
https://api.open-meteo.com https://air-quality-api.open-meteo.com
https://geocoding-api.open-meteo.com; object-src 'none'; base-uri 'self';
form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

`script-src 'self'` with no inline allowance, no `unsafe-eval`, `object-src 'none'` and
`frame-ancestors 'none'` are the important parts and they are present. Nothing was changed
here overnight.

**HDR-2 (deferred).** Recommended follow-ups, to be applied and tested in a separate change:
add `worker-src 'self'` (service worker registration currently falls back to `script-src`),
add `manifest-src 'self'`, add `frame-src 'none'`, and later evaluate
`require-trusted-types-for 'script'`. Removing `style-src 'unsafe-inline'` is not practical
with static headers because motion and Tailwind emit inline style attributes; it would need
nonces or hashes plus a build step. Adding `Cross-Origin-Opener-Policy: same-origin` is safe;
do not add COEP without checking the cross-origin Supabase Storage avatar images first.

**HDR-3 (risk-accepted).** `_headers` is a Cloudflare Pages feature. The deployed host is
Cloudflare Pages (`og:url` points to `runcast-2ju.pages.dev`). The root `vercel.json` sets
rewrites but no headers, so if the app is ever served from Vercel the header set must be ported
there or it silently disappears. Left as is because Cloudflare Pages is the active platform.

## Verification

- `npm audit --workspaces`: 0 vulnerabilities (was 3 moderate).
- `npm run typecheck`: pass.
- `npm run test`: 338 tests in 25 files, pass.
- `npm run lint -w app`: 0 errors, 2 pre-existing react-refresh warnings.
- `npm run build`: pass.
- `cd app && npx playwright test`: 89 passed.
- `npx prettier --check .`: pass.
