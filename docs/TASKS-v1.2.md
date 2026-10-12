# TASKS v1.2 — dizajn refresh, plan generator, 3 nove feature

> **STATUS: SVA TRI ZADATKA ZAVRŠENA** ✅ (T1 dizajn+light/dark · T2 plan recalibracija ·
> T3 race-day + fueling + ICS). Finalno: 166 unit + 25 E2E zeleno; commit u `main`;
> Cloudflare auto-deploy verifikovan.

Master plan za tri zadatka. Izvršava se **zadatak po zadatak** (T1 → T2 → T3), sa testnim
kapijama posle svake faze. Radni stil: 1 agent po celini, faze istraživanje → plan → arhitektura →
implementacija → testovi; orkestrator (glavni agent) piše kontrakte, rešava konflikte, verifikuje
nezavisno i na kraju commit/push.

---

## T1 — Dizajn refresh + light/dark mode

**Cilj:** app trenutno izgleda „AI generisano" (uniformne kartice, generičke labele, ravna
hijerarhija, bez ličnosti). Želimo topliji, korisniku bliži dizajn po uzoru na Runna/Strava/NRC/
Garmin/Apple Fitness, + light/dark toggle sa sistemskom preferencijom.

**Wave A — istraživanje (3 agenta paralelno, bez izmena koda):**

- **A1 — Pages audit vs reference:** screenshot-uje trenutne strane (Playwright, lokalni dev),
  istražuje Runna/Strava/NRC/Garmin/Apple Fitness/Whoop ekrane (web + App Store screenshotovi),
  i piše `docs/design/01-pages-audit.md`: za svaku stranu (Today, Plan, Workout, GuidedRun, Stats,
  Settings, Onboarding, Login/Register) — šta menjamo (hijerarhija, gustina, kartice vs redovi,
  hero tretman, boje faza, empty states, mikro-tekst) sa konkretnim predlozima (ne kritika —
  specifikacija za implementaciju).
- **A2 — Sistem + ton:** `docs/design/02-system-tone-audit.md`: tipografska skala (display brojevi,
  sekcije), radius/senke/ivice, ikonografija, motion; audit svih UI stringova (koji zvuče robotski
  npr. „Detalj treninga", „Ova nedelja", „Ostavi kako je") → topliji coaching ton (srpski), lista
  pre/posle; predlog „personality" akcenata (boja po fazi plana, race kartica, streak tretman).
- **A3 — Theming arhitektura:** `docs/design/03-theming.md`: Tailwind v4 `@theme` → light/dark
  preko CSS varijabli (`:root[data-theme]`), sistemska preferencija (`prefers-color-scheme`) +
  localStorage + `meta[theme-color]`; **kompletan audit hardkodovanih boja** u kodu (soft rgba,
  gradijenti, weather boje, chart boje, ProgressRing SVG `var()`); light paleta sa WCAG AA
  kontrastima (tabela), pravila za materijale (blur pozadine u svetloj temi), Motion/reduced-motion
  kompatibilnost; gde ide toggle (Settings sekcija „Izgled": Sistem/Svetla/Tamna + brzi toggle u
  headeru), test plan (E2E: toggle perzistira posle reload-a, obe teme bez overflow-a).

**Wave B — implementacija (2-3 agenta sekvencijalno):**

- **B1:** theming arhitektura (A3 spec) — tokeni, ThemeProvider/hook, toggle UI, meta color,
  migracija hardkodovanih boja; testovi: E2E `theme.spec.ts` (toggle + persist + obe teme responsive).
- **B2:** redizajn primitiva + Today + Workout (A1/A2 spec).
- **B3:** redizajn Plan + Stats + Settings + Onboarding + Auth + copy rewrite (A2 lista).

**Kapija T1:** typecheck, 125+ unit, lint, **svi E2E (13+)** + novi theme spec, build; screenshot
kontrola obe teme; responsive spec i u light temi.

---

## T2 — Plan generator: realniji volumen i duži long run-ovi

**Pritužba:** „najduže što plan daje je 12 km u martu, a Claude daje 30 km".

**Hipoteza:** korisnik je na `lt20` bendu → start 15 / peak 40 km/ned, `first` cap 55; long run =
32% nedelje uz cap 28 → max ≈ 12,8 km. Realni maraton planovi za početnike (Higdon Novice, Runna)
piku na 50–65 km/ned sa long run-om 30–32 km. Naš model je previše konzervativan i long run je
„izveden" iz nedeljnog volumena umesto obrnuto.

**Wave A — istraživanje (1 agent):** kako Runna / Hal Higdon / Pfitzinger / NRC / Garmin Coach
grade maraton planove za početnike (start/peak km, long-run progresija, % nedelje u piku,
cutback/taper), i za HM/10K/5K; treadmill tabele (koliko nedelja, koji porast); pravila
„+X km/ned". Piše `docs/design/04-plan-generator-research.md` sa brojevima izvora.

**Wave B — implementacija (1 agent):** recalibracija `plan-generator.ts` po modelu
**„long-run-first"**:

- ciljni long run po distanci trke: M 30–32 km, HM 18–21, 10K 10–12, 5K 6–8 (progresija sa
  cutback-om, bez long run-a u trka-nedelji — ostaje);
- nedeljni volumen se **izvodi** iz long run-a (long + potpora: kvalitet + easy, min 2 km po easy
  danu) uz novi ramp (npr. peak nedelja = long/0.45 ±, clamp na realne bendove);
- bendovi podignuti: lt20 → start ~24 peak ~55–60; 20-40 → ~32/~65–70; 40-60 → ~40/~75–80;
  gt60 → 50/~90; `first` cap → peak 60–65;
- bazni plan (bez sidra) — long run do 16–18 km umesto 12;
- svi postojeći invarianti ostaju: rast ≤ max(daysPerWeek,10) km/ned (po potrebi korigovati granicu
  uz obrazloženje), cutback svaka 4., taper 3 nedelje, long run dan fiksiran, kvalitet 48h+ razmak.

**Kapija T2:** unit testovi plan-generatora ažurirani sa realnim očekivanjima (uključujući
regresioni test „lt20 + M trka → long run u piku ≥ 28 km"); E2E (13) zeleno; kratak izveštaj sa
novim brojevima (start/peak/long po bendu) u docs.

---

## T3 — 3 nove Runna feature (nedostaju)

Redosled: R1 → R2 → R3 (jedan agent po feature-u, faze research→plan→arch→impl→test).

- **R1 — Race-day strategija:** kartica za dan trke: plan tempa po segmentima (negative/even
  split), 5 km splits tabela, checklist (oprema, broj, gelovi), weather-aware preporuke za dan
  trke; dostupno iz countdown chip-a i WorkoutPage za RACE workout. Fajlovi: `shared/raceday.ts`,
  `components/workouts/RaceDayCard.tsx`, `pages/RaceDayPage.tsx` (ruta `/race-day`), Stats/Today
  ulazi.
- **R2 — Fueling & hidratacija:** preporuke po treningu: pre-trening (2–3 h), tokom (dugi trk:
  gelovi na X min, voda), posle; integracija u **guided run** kao audio cue-ovi na dugim trkovima
  (F1 hook) + sekcija na detalju treninga; edukativna kartica u Settings (opcija uključeno/isključeno).
  Fajlovi: `shared/fueling.ts`, `components/workouts/FuelingCard.tsx`, guided `useSpeechCues`
  proširenje (cue schedule), Settings toggle.
- **R3 — Kalendar sync (ICS):** export plana kao ICS feed (preuzimanje fajla) + „dodaj u Google
  Calendar" link po treningu; Settings dugme „Izvezi plan (.ics)"; sadržaj: svi PLAN treningovi sa
  naslovom, trajanjem (iz distance/tempa ili durationSec), opisom (koraci). Fajlovi:
  `shared/ics.ts` (pure builder + RFC 5545 escaping), `features/plans/export.ts`, Settings + Today
  akcija. Bez novih depova.

**Kapija T3:** po feature-u unit + E2E spec (`raceday.spec.ts`, `fueling.spec.ts`, `ics.spec.ts` —
ICS download se testira preko Playwright download eventa), pa pun suite.

---

## Završna kapija (posle sva 3 zadatka)

1. `npm run format` + `prettier --check .`
2. `npm run typecheck` (root) · `npm run test` · `npm run lint -w app` · `npm run build`
3. `cd app && npx playwright test` — ceo suite (procena: 16+ specova)
4. `PLAN.md` + `docs/TASKS-v1.2.md` ažurirani (checkboxi)
5. Commit (1-3 smislena commita: dizajn / plan generator / feature-i) + push
6. Verifikacija: GH CI zelen, Supabase migracije (ako ih ima) auto-primenjene, Cloudflare deploy
   zelen, prod smoke + provera novih stringova u prod chunk-ovima.

## Globalna pravila za agente

- Kontrakti i vlasništvo fajlova se definišu pre svake wave (kao `docs/features/CONTRACTS.md`).
- Nijedan agent ne dira tuđe fajlove; postojeći E2E selektori se ne smeju slomiti
  (lista u `docs/features/CONTRACTS.md` §E2E stabilnost važi i dalje).
- Bez komentara u kodu; srpski UI; bez novih dependency-ja bez odobrenja.
- Posle svake faze: typecheck + shared testovi + lint + relevantni E2E.
