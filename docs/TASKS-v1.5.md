# TASKS v1.5 — humanizacija teksta, notifikacije 2.0, weather fokus, manualni reschedule, animacije, launch polish

## Status tracker

- [x] H — Humanizacija: ukloniti AI crtice (—) iz svih tekstova (locales sr/en, shared content, generator, E2E asertacije)
- [x] P — Launch polish: favicon/OG/SEO meta, robots, per-route title, alt audit, mejl šabloni (RunCast brend) + uputstvo
- [x] AN-R — Istraživanje animacija (Strava/NRC/Runna/Garmin/Fitness) → docs/design/05-animations.md
- [x] N2 — Notifikacije 2.0: tipovi (danas/sutra/vreme/propušteno/trka-nedelja/nedeljni rezime), remind_hour + timezone, Settings, funkcija po lokalnom satu, cron po satu
- [x] W2 — Weather fokus: prognoza gore na Danas (hero), „najbolji termin danas", 7-dnevni outlook + skor u kalendaru, proširenja modula
- [x] M — Manualni reschedule: „Pomeri trening" (bilo koji dan, swap RPC) + „Adaptiraj nedelju" (propušteni → preraspodela + rebalans volumena, apply RPC)
- [x] AN-I — Implementacija odabranih animacija (brojači, chart entrance, ring, badge unlock)
- [x] Final — 253 unit + 44 E2E; commit/push + CI/deploy verifikacija kapija + iPhone uputstvo + commit/push + CI/deploy verifikacija

## Odluke

- **H**: „ — " → „: "/„, "/„ · " zavisno od konteksta; nijedna rečenica ne počinje crticom; ažurirati E2E asertacije koje ciljaju promenjene stringove (npr. rain test); generator labele („Snaga A: noge i core", „Čučnjevi 3×12") menjaju se u kodu + testovima; postojeći planovi u bazi zadržavaju stare labele (render-time normalizacija „ — " → „ " u steps labelama).
- **N2**: push_subscriptions dobija `remind_hour` (default 18), `timezone`, `remind_today`, `remind_weather`, `remind_missed`, `remind_recap` (postojeći: remind_training→„sutra", remind_race_week). Funkcija se poziva **svakog sata**; šalje tipove čiji se lokalni sat poklapa (danas=07, ostali=remind_hour; recap samo nedeljom; missed samo ako danas postoji PLANNED a nije DONE i prošlo je remind_hour+2).
- **W2**: weather hero na vrhu Danas (pre treninga), „Najbolji termin danas: 18–20h · skor 92" (novi shared `bestWindow`), 7-dnevni outlook traka sa skorovima ispod hero-a, skor-badge u kalendaru plana; sve reuzima postojeći scoreWindow.
- **M**: „Pomeri" na treningu → izbor datuma (±14 dana, unutar plana) → swap sa postojećim danom (uklj. REST) preko `swap_workouts`; „Adaptiraj nedelju" kad postoje propušteni PLANOVI: `rebalanceWeek` (shared, čist) računa nove datume (long run ostaje, kvalitet čuva razmak) + `apply_week_plan` RPC (nova migracija) primenjuje; propušteni se označavaju SKIPPED.
- **P**: favicon.ico + 32/180 ikone + og-image (Playwright render), meta/OG/Twitter u index.html, robots.txt, `usePageTitle` (lokalizovani naslovi po ruti), email šabloni u `config.toml` (sr, RunCast brend) + uputstvo za primenu (dashboard/config push; custom SMTP za brendiranog pošiljaoca — korisnikov korak).
- **AN-I**: bez novih depova; Motion-only, reduced-motion gate svuda.

## Pravila

Kao i do sada: 39 E2E zelen posle svake faze (broj raste), typecheck/test/lint, bez komentara,
sr/en ključevi paralelno, migracije `npx supabase migration new`.
