# TASKS v1.4 — P1 sweep, notifikacije (PWA + push), sRPE, nedovršeni planovi, smart weather reschedule

## Status tracker

- [x] W1-A — Smart weather reschedule (feature #5): score dana, rangirane opcije, prompt na Danas, swap
- [x] W1-B — sRPE training load (shared + Stats + coach integracija)
- [x] W2 — PWA (manifest, SW, offline shell, update prompt) + Apple design faza 2 + sitni P2
- [x] W3 — Web push: `push_subscriptions`, Settings „Notifikacije", Edge Function + cron, test push
- [x] W4a — P1 sweep (shared): RUN_TYPES single source, test gapovi, `parseWorkoutSteps`, `planPaces/planAnchor`, auth-errors po kodu
- [x] W4b — P1 sweep (app): tihi 0-row update-i, prerani setQueryData, PlanPage isError, cal-cell testid, `<a><button>`, split TodayPage/GuidedRunPage
- [x] Final — 237 unit + 39 E2E; commit/push + CI/deploy verifikacija kapija + PLAN.md/tracker + commit + push + CI/deploy/prod verifikacija

## Feature #5 — Smart weather reschedule (zahtev)

Kada je danas planiran trening a loše je vreme: app **pita** (jednom dnevno, dismissable) „Pomeriti
trening?", **sam izračuna najbolju opciju** (rangira dane nedelje po vremenskom skoru u prozoru
treninga, uz pravila rasporeda: kvalitet ↔ easy/rest, long run fiksiran, 48h razmak, nikad u
prošlost/RACE) i ponudi 2–3 opcije + indoor fallback; primena = swap (postojeći RPC), nedelja
ostaje strukturno ista („preračunata"). Push podsetnik (W3) koristi isti predlog.

## Web push (zahtev #2)

- PWA prvo (W2): `vite-plugin-pwa`, manifest, ikone (192/512), offline shell, update prompt.
- `push_subscriptions` tabela + RLS; Settings sekcija „Notifikacije" (dozvola, tipovi: trening
  sutra / trka-nedelja, test dugme); subscribe preko `pushManager` (VAPID public iz RPC-a
  `get_push_public_key`).
- Edge Function `send-reminders` (Deno): čita subscriptions (service role), za svakog korisnika
  sutrašnji trening + vreme (Open-Meteo) + predlog; šalje preko web-push (npm: specifier).
  VAPID par se generiše pri prvom pozivu i čuva u `push_config` (bez commited tajni, bez dashboard
  koraka). Auth: header `x-cron-secret` protiv vrednosti iz `push_config`.
- GitHub Actions dnevni cron (18:00 lokalno ≈ 16:00 UTC) poziva funkciju; secret `PUSH_CRON_SECRET`
  se setuje kroz `gh` (vrednost iz DB-a).
- Deploy funkcije: Supabase GitHub integracija (deploy na push) ili MCP `deploy_edge_function`.

## sRPE (zahtev #3)

`shared/srpe.ts`: `sessionLoad(rpe, sec) = rpe × min`; acute (7d suma), chronic (28d / 4),
ACWR + bendovi (<0.8 nisko, 0.8–1.3 sweet spot, 1.3–1.5 oprez, >1.5 visok), `insufficient` stanje;
Stats kartica (8-nedeljni load bar + ACWR bend + kratko objašnjenje „heuristika, ne dijagnoza");
coach: ACWR > 1.4 → novi uvid sa akcijom „Olakšaj 10%" (postojeća infrastruktura).

## „Planirano a nije implementirano" (zahtev #4)

- PWA install + offline shell (gore, W2) — bio #2 preporuka istraživanja.
- Apple design faza 2 (`docs/plans/design-apple.md` §4): segmented pill `layoutId`, tab indikator,
  page tranzicije (opacity pod reduced-motion), scroll-edge maska (bez karusela — nema pagera).
- Review P2 sitno: `formatKm` dedupe, `config.toml` min password 8 (paritet sa UI), P2 ostalo
  ostaje dokumentovano.
- Eksplicitno NE radimo: Google login (korisnik odustao), mobilna app, shoe tracking, Strava sync
  (dokumentovano u `docs/features/11`).

## Pravila

Kao i do sada: E2E (33) zelen posle svake faze; typecheck/test/lint; bez komentara; sr/en ključevi
paralelno; migracije preko `npx supabase migration new` (ime=verzija); commit/push na kraju.
