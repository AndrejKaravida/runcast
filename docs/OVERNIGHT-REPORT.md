# Overnight report — hardening i polish (v2.2)

11 talasa, svaki završen zelenim stanjem (typecheck, unit, E2E, CI, deploy). Finalno stanje:
**356 unit + 122 E2E testa**, E2E sada i u CI-ju, produkciona šema i deploy verifikovani.

## Talasi

1. **Bezbednost** — nađene i popravljene prave rupe: friendship pair forge (trigger zamrzava
   par i status), server-side kvote za zahteve prijateljstva (100 pending / 20 za 24h) i
   pretragu (rpc_rate_limits), sužena vidljivost pending zahteva, shoe ownership guard, blokovi
   u globalnim rang listama, initplan politike, privilege revoke-ovi. `docs/SECURITY-AUDIT.md`,
   `docs/SECURITY-CLIENT.md` (npm audit 3 → 0, open redirect u push-sw, .gitignore).
2. **E2E u CI-ju** — novi `e2e` job (lokalni Supabase + Playwright), retries/trace na CI,
   `PLAYWRIGHT_OUTPUT_DIR` za paralelne run-ove. Prvi run zelen.
3. **Pristupačnost + kontrast** — 20 nalaza (14 popravljeno: aria-describedby/role=alert,
   role=status, skip link, progressbar semantika, focus restore, focus trap), kontrast skript
   nad 94 para (3 svetle greške popravljene tokenima). `docs/A11Y-AUDIT.md`, `docs/CONTRAST-AUDIT.md`.
4. **i18n** — parity checker u CI-ju (16/16 namespace-a, 0 problema), 72 en-dash-a očišćeno,
   copy unifikovan. `docs/I18N.md`.
5. **Performance + PWA** — Inter subset (latin + latin-ext), manifest id/description,
   clientsClaim, bundle report (entry 99 kB gzip, nijedan chunk > 200 kB), `offline.spec`
   (build + preview + SW + offline navigacija). `docs/PERFORMANCE.md`.
6. **Otpornost** — route error boundary (uključujući chunk-load failure poruku), guard
   fail-safe, mutacije bez tihih padova (friends/kudos/onboarding), unhandledrejection net.
   `docs/RESILIENCE.md`.
7. **DB performance** — kompozitni indeksi (workouts, friendships, races, shoes), EXPLAIN
   dokazi (npr. 0.063 → 0.023 ms), seed skript. `docs/DB-PERFORMANCE.md`.
8. **Datumi i vremenske zone** — 4 prava buga: health import zone, 90-dnevni prozor, serverski
   `current_date` u recalibrate (migracija sa `p_today`), FIT/TCX civil day; DST-safe testovi
   (356 unit TZ-nezavisnih). `docs/DATE-TIME.md`.
9. **E2E dubina** — mapa pokrivenosti (53 spec-a), 13 novih testova (onboarding varijante,
   plan/today depth, social ivice, export sadržaj). `docs/E2E-COVERAGE.md`.
10. **UX propusti iz audita** — edit postojećeg zapisa, trajni mute, rename patika, pace hint.
11. **Email šabloni** — brendirani (confirmation/recovery/magic link/email change), Mailpit
    verifikacija; prod koraci u LAUNCH-READINESS (dashboard paste + SMTP).

## Otvoreno (dokumentovan backlog, ne blokira)

- Prava naplata (`backlog/pricing.md`), monitoring (`backlog/monitoring.md`), feed paginacija,
  polje „bol" u logu, username korak u onboardingu, WorkoutKit/Watch app, blending trka,
  RPE-adherence.
- Korisničke akcije pre objave ostaju u `docs/LAUNCH-READINESS.md` (SMTP, domen, store forme,
  pravna revizija, premium dodela).
