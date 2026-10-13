# RunCast — plan i status

Marathon training app koja povezuje VDOT (Jack Daniels) plan treninga sa vremenskom prognozom
i predlaže zamenu treninga unutar iste nedelje kada uslovi nisu dobri.

## Status

| Faza | Sadržaj                                                                                                               | Status |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| 0–10 | v1: shared paket, Supabase šema, auth, onboarding, plan, danas, logovanje, E2E, deploy config                         | ✅     |
| 11   | Audit svih delova app-a (5 subagenata) → `docs/plans/01..05-*.md`                                                     | ✅     |
| 12   | P0/P1 ispravke po auditima (vidi „Ispravke" ispod)                                                                    | ✅     |
| 13   | Home dashboard sa widgetima (nedeljni progres, niz, countdown, sledeći trening, aktivnosti)                           | ✅     |
| 14   | Apple-style design pass → `docs/plans/design-apple.md`                                                                | ✅     |
| 15   | E2E proširen na 7 scenarija                                                                                           | ✅     |
| 16   | v1.1: 5 Runna-inspirisanih feature-a (vidi sekciju ispod) → `docs/features/*`                                         | ✅     |
| 17   | v1.2/T1: dizajn refresh po referencama (Runna/Strava/NRC/Garmin) + light/dark tema sa toggle-om → `docs/design/01-03` | ✅     |
| 18   | v1.2/T2: plan generator recalibracija (long-run-first, realni volumeni) → `docs/design/04`                            | ✅     |
| 19   | v1.2/T3: 3 nove feature (race-day strategija, fueling, ICS export) → `docs/features/06-08`                            | ✅     |
| 20   | v1.3/L: potpuna lokalizacija (i18next, sr/en, ~500 ključeva, shared sadržaj kroz ključeve)                            | ✅     |
| 21   | v1.3/R: arhitekturalni review (6 agenata → `docs/review/*`) + sve P0/P1 popravke                                      | ✅     |
| 22   | v1.3/F: gamifikacija + profil/avatar/rang lista + benchmark recalibracija tempa                                       | ✅     |

Testovi: **269 unit** (shared) + **50 E2E** (Playwright kroz pravi UI) + typecheck/lint/build.

## Struktura

```
runcast/
  app/                 # Vite SPA (React 19, Tailwind v4, React Router 8, TanStack Query, Motion)
    src/auth/          # AuthProvider (cache hygiene), guards
    src/components/    # ui (Button/Card/Input/Badge/Modal(sheet)/ConfirmDialog/QueryError/ProgressRing/…)
    src/features/      # profile / plans (+ progress utils) / logs / weather
    src/pages/         # Login, Register, Reset, Onboarding, Today, Plan, Workout, Stats, Settings
    e2e/               # 29 Playwright scenarija
    public/_redirects  # SPA fallback (Cloudflare Pages)
    public/_headers    # sigurnosni headeri (CF Pages)
  packages/shared/     # pure TS: vdot, plan-generator, weather, weather-rules, schemas (+ 170 testa)
  supabase/            # config + migracije 0001 (šema/RLS) i 0002 (RPC-ovi, integrity)
  docs/plans/          # auditi 01–05 + design-apple.md
  .github/workflows/   # ci.yml (checks + migrations), backup.yml, keepalive.yml
```

## Ključne odluke i ispravke posle audita

1. **Plan nedelje su sidrene na datum trke** — poslednja nedelja se završava na dan trke; prva je
   skraćena po potrebi. Rešava „long run 2 dana pre maratona" i pokriva ceo prozor tačno jednom.
   Napomena: kada je trka tačno N×7 dana od starta, plan ima N+1 nedelja (prva je jednodnevna).
2. **Dani treninga po weekday-u** — `longRunDay`/kvalitet/easy se sada poklapaju sa stvarnim danima
   nedelje za svaki start (ranije je radio samo za ponedeljak).
3. **VDOT tempi po Daniels tabelama** — E/M/T se izvode iz %VO₂max (inverzija kvadratne jednačine),
   I/R iz % brzine; VDOT 44 → E 6:29–5:25, M 5:06, T 4:48 (±8 s test).
4. **Atomicne operacije u bazi** — `swap_workouts` i `create_plan_with_workouts` RPC (jedna
   transakcija); regeneracija **briše** stari plan (nema ghost treninga), `run_logs` istorija ostaje.
5. **RLS pojačan** — FK roditelji (plan/race/workout) se proveravaju pri insert/update; po jedan
   ACTIVE plan po korisniku (unique index); dodati indeksi.
6. **Swap/RACE/REST zaštite** — zamena samo PLANNED↔PLANNED, nikad u prošlost, nikad RACE cilj;
   REST dan nikad ne dobija predlog; RACE dobija `warn` umesto `swap`.
7. **Vremenski validator** — `99:99`/`3:75:00` odbijeni; `90:30` (trajanje treninga) dozvoljeno.
8. **Cache hygiene** — TanStack cache se čisti na sign-out/promenu korisnika.
9. **Apple design pass** — press na pointer-down, draggable sheet sa spring/velocity dismiss,
   translucidan chrome, reduced-motion/transparency/contrast, focus-visible, focus trap
   (detalji: `docs/plans/design-apple.md`).
10. **Home dashboard** — hero (trening + verdikt + CTA), race/plan chip + niz, week board sa
    progres prstenom, sledeći trening, poslednje aktivnosti, prognoza; svi podaci iz postojećih
    upita (jedan `useWorkoutsRange` za ceo plan).

## Kako se pokreće lokalno

```bash
npx supabase start          # lokalna baza + auth (Docker)
npm install
npm run dev                 # http://localhost:5173

npm run test                # 170 unit testa
npm run typecheck && npm run lint
npm run test:e2e -w app     # 29 E2E (traži supabase start + dev server)
npm run db:types            # regeneriši TS tipove iz lokalne baze
npm run build               # produkcijski build (route-level code splitting)
```

`.env.local` je popunjen lokalnim Supabase URL-om i anon ključem; lokalne email potvrde su
isključene (`supabase/config.toml`).

## Hosted okruženje — trenutno stanje

- **GitHub:** https://github.com/AndrejKaravida/runcast (main), GH Actions aktivni.
- **Supabase (projekat `zhwqqcewxccwjhtdkvck`):** migracije primenjene
  (`init_schema`, `data_integrity`, `harden_functions`), 5 tabela sa RLS, security advisori **0
  upozorenja**. URL: `https://zhwqqcewxccwjhtdkvck.supabase.co`.
- **GitHub secrets:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (keepalive je aktivan).
- **Supabase ↔ GitHub integracija: AKTIVNA i verifikovana** — probna migracija push-ovana u `main`
  automatski je primenjena na produkciju za ~60 s (pa uklonjena iz istorije). Od sada svaki push koji
  menja `supabase/migrations/**` sam ide na produkciju; `db-migrate.yml` je uklonjen kao redundantan.
  Bitno: ime fajla migracije mora da odgovara verziji u istoriji (`YYYYMMDDHHMMSS_naziv.sql`) — kada
  migraciju praviš lokalno preko `supabase migration new`, to je automatski tačno; migracije
  primenjene ručno (MCP/SQL) moraju da se imenuju po stvarnoj verziji.
- **CI validacija migracija:** `ci.yml` job `migrations` (`supabase start` + `supabase db reset`) prolazi
  sve migracije na PR-u pre merge-a.
- **Responsive:** automatski E2E audit (320/375/768/1440, sve strane + log sheet + ceo onboarding
  na 320) — bez horizontalnog overflow-a; ispravljeni kontrast, dugmad koja se prelamaju,
  truncate za duge nazive, 44px touch targeti.

### Deploy frontenda — Cloudflare Pages (ZAVRŠENO)

- Pages projekat **`runcast`** je vezan na GitHub repo (`main`) — **svaki push automatski pokreće
  build i deploy** (verifikovano: push → build → deploy za ~2 min).
- Produkcija: **https://runcast-2ju.pages.dev** — 200, `_headers` (nosniff/referrer/permissions) i
  SPA fallback rade, env varijable (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NODE_VERSION=24`)
  ugrađene u bundle (provereno grep-om nad `index-*.js`).
- Build config: `npm run build -w app`, output `app/dist`, root `/`.
- Cloudflare MCP (OAuth) je aktiviran za buduće operacije; `wrangler` CLI ulogovan za ručne deploye.

### Šta je ostalo ručno (sve opciono)

Auth URL konfiguracija je **završena**: Site URL = `https://runcast-2ju.pages.dev`, Redirect URLs =
`https://runcast-2ju.pages.dev/**` — ceo lanac (registracija → potvrda mejla → login → reset lozinke)
je zatvoren.

1. **Backup (opciono):** `SUPABASE_DB_URL` kao **session pooler** string
   `postgresql://postgres.<ref>:<pw>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require`
   (ne direktni host — IPv6-only; ne port 6543). Backup pokriva `public` šemu, ne `auth` korisnike.
2. **Napomene:** Supabase free projekat se pauzira posle 7 dana bez aktivnosti (keepalive ping je već
   podešen sa secret-ima). Default SMTP ima mali dnevni limit — za produkciju razmotriti Resend.
   E2E u CI-ju nije uključen (zahteva `supabase start` u job-u); pokreće se lokalno.

## v2.0 — FIT export, readiness u proceni, kontinuitet trka

- **FIT export** (F25): pravi strukturirani workout fajl za Garmin (FileId/Workout/WorkoutStep
  sa pace targetima u mm/s, CRC-16) — encoder u čistom TS-u bez zavisnosti; dugme „Garmin
  (.fit)" pored TCX-a.
- **Readiness u dnevnoj proceni** (F26): „Umoran" + quality trening danas → predlog u hero
  kartici („Zameni laganim danom" ili upozorenje); vremenski banner ima prioritet; ReadinessCard
  ne duplira isti hint.
- **Kontinuitet trka** (F27): posle plana oporavka, kartica „Sledeći cilj" vodi na generisanje
  plana sa unapred izabranom budućom trkom iz kalendara (`/settings/plan?race=...`).

## v1.9 — audio coach, readiness, više trka, adherence rang lista

- **Audio coach** (F21): TTS naracija u vođenoj trci — BRIEF (cilj, distanca, pace zona),
  COACH po segmentima, ENCOURAGE na 60%, FUEL na 45 min dugih trka, SUMMARY na kraju
  (vreme, distanca, avg pace); deterministički izbor varijanti teksta, sr/en.
- **Readiness** (F22): san + HRV/RHR iz Health-a (opt-in toggle, lokalna obrada, baseline iz
  28 dana) → kartica na Danas (Svež/Normalan/Umoran + hintovi), skeleton; proširena politika
  privatnosti i Health Connect permisije.
- **Više trka** (F23): lista trka u Settings → Plan (dodaj/uredi/obriši, oznaka „Cilj plana",
  blokirano brisanje ciljne), izbor ciljne trke pri generisanju plana.
- **Adherence rang lista** (F24): rangiranje po pridržavanju plana (urađeno/propisano %) uz
  prebacivanje metrike „Kilometraža"/„Pridržavanje" u globalnoj i friends listi — diferencijator
  u odnosu na volumen-liste konkurencije.

## v1.8 — watch export, poravnanje plana, plan oporavka

- **TCX izvoz za sat** (F18): svaki trening se izvozi kao TCX sa strukturiranim koracima i pace
  targetima (Speed zone) za Garmin Connect / COROS / Polar / Strava; akcija na stranici treninga
  i u vođenom pregledu; bez novih zavisnosti.
- **Poravnanje ostatka plana** (F19): kad se propusti 3+ treninga u 14 dana, jedna kartica
  poravna ceo ostatak plana (propušteni → SKIPPED, PLANNED po slobodnim danima uz dugi trk na
  izabranom danu i razmak quality dana); reuse `apply_week_plan` RPC.
- **Plan oporavka posle trke** (F20): posle dana trke ponuda „2 nedelje oporavka" (EASY +
  mobilnost, bez quality rada); `create_plan_with_workouts` već podržava plan bez trke.

## v1.7 — konkurentska analiza, live tracker, custom dani, edit trke, prijatelji

- **Konkurentska analiza** (`docs/features/13-competitive/report.md`): matrica 15 aplikacija,
  rangirane praznine (in-run iskustvo, workout na sat, adaptivni plan, S&C, audio, social) i
  naši diferencijatori (weather loop, adherence rang lista, benchmark auto-rekalibracija).
- **Live GPS tracker** (F14): živa distanca + progres do planirane, live/avg pace, km splitovi,
  auto-pause sa histerezom, GPS-lost baner, haptic/beep/govorni cue-ovi, wake lock, ručni
  fallback; `run_logs.source` (gps/manual); native lokacijske permisije.
- **Custom dani plana** (F15): interaktivni izbor tačno kojih dana u nedelji se trči (dugi trk
  posebno); generator `runDays` uz potpuno backward-compatible default; validacija u onboardingu
  i settings regeneraciji.
- **Edit trke** (F16): izmena naziva/datuma/distance/ciljnog vremena iz Settings → Plan, uz
  eksplicitnu ponudu regeneracije plana; `races_update_own` politika.
- **Scroll-to-top**: svaka navigacija (uključujući podstranice van tabova) počinje od vrha.
- **Prijatelji / social MVP** (F17): mutual friendship (zahtev/prihvatanje), feed prijateljskih
  treninga, kudos, friends-only rang lista, blokiranje, pretraga samo po tačnom imenu profila
  (bez email pretrage); RLS: prijatelji vide logove, javni profil ostaje opt-in; sekcija u
  politici privatnosti + export/brisanje pokrivaju social tabele.

## v1.6 — native shell, Health integracije, splash, floating dock, shoes

- **Capacitor native shell**: ista codebase kao prava Android/iOS app (bez browsera); Android APK
  build lokalno i u CI-ju (artifact), iOS projekat verifikovan build-om (Xcode 27); uputstva u
  `docs/NATIVE.md` (uključujući besplatnu iOS instalaciju sa 7-dnevnim potpisom).
- **Health integracije**: Apple Health + Health Connect preko `@capgo/capacitor-health` adaptera;
  uvoz trčanja u logove (dedupe po external_id + tolerancije, match na plan, auto-DONE);
  Xiaomi/Zepp put preko Mi Fitness sync-a; Settings „Integracije" (web prikazuje „dostupno u
  mobilnoj aplikaciji"); `run_logs.external_id` + unique index.
- **Splash**: animirani runner (SVG mark) u web overlayu i loaderu + native splash resursi.
- **Floating dock** meni sa safe-area (viewport-fit=cover).
- **Shoe tracking**: „Oprema" u Settings (dodavanje, početna kilometraža, penzionisanje, brisanje),
  izbor patika pri beleženju treninga, kilometraža po patikama (`shoes` tabela + `run_logs.shoe_id`,
  `log_workout` RPC proširen).

## v1.5 — humanizacija, notifikacije 2.0, weather fokus, manualni reschedule, animacije, launch polish

- **Humanizacija**: 236 AI crtica (—) uklonjeno iz svih tekstova (sr/en, shared sadržaj, generator,
  push poruke); render-time normalizacija starih labela; E2E asertacije ažurirane.
- **Notifikacije 2.0**: 6 tipova (Danas ujutru, Trening sutra, Vremensko upozorenje, Propušten
  trening, Trka nedelja, Nedeljni rezime), izbor sata (5–22) + timezone po korisniku, funkcija se
  poziva svakog sata i šalje po lokalnom vremenu, cron `0 * * * *`.
- **Weather fokus (RunCast!)**: WeatherHero na vrhu Danas sa „najbolji termin danas" (skorovan
  prozor), 7-dnevni skor u kalendaru plana sa legendom.
- **Manualni reschedule**: „Pomeri" na treningu (bilo koji dan iz plana, swap RPC) i „Adaptiraj
  nedelju" (propušteni → SKIPPED + automatska preraspodela preostalih uz očuvanje long run-a i
  razmaka kvaliteta, `apply_week_plan` RPC).
- **Animacije**: count-up brojevi, chart/bar entrance, badge pop + toast spring, completion moment,
  list stagger (Motion, reduced-motion gate).
- **Launch polish**: favicon set + OG slika, SEO/OG/Twitter meta, robots + sitemap, per-route title
  hook, brendirani mejl šabloni (`supabase/templates/*`, RunCast brend), `docs/LAUNCH-CHECKLIST.md`.

## v1.4 — notifikacije, smart reschedule, sRPE, P1 sweep

- **Smart weather reschedule**: skorovanje dana/prozora po pravilima, rangirane opcije (swap/shift/
  indoor), dnevni prompt „Pomeriti trening?" sa najboljom opcijom i alternativama; primena kroz
  postojeći swap RPC (nedelja ostaje strukturno ista).
- **Web push**: `push_subscriptions` + `push_config` (VAPID/cron tajna se auto-generišu, bez
  commited tajni), Settings „Notifikacije" (dozvola, tipovi, test), Edge Function `send-reminders`
  (sutrašnji trening + vreme + predlog; trka-nedelja), dnevni GitHub cron sa `PUSH_CRON_SECRET`.
- **PWA**: manifest + ikone, service worker (precache shell, bez keširanja API-ja), offline shell,
  update prompt; **Apple design faza 2**: klizeći segmented pill, tab indikator, page tranzicije,
  scroll-edge maska.
- **sRPE training load**: acute/chronic/ACWR + bendovi, LoadCard na Stats, coach uvid pri
  preopterećenju (akcija „Olakšaj").
- **P1 sweep**: RUN_TYPES single source, `parseWorkoutSteps` runtime validacija, `planPaces/planAnchor`
  helperi (nema više cast-ova), `AppLinkButton` (validan HTML), tihi 0-row update-i sada bacaju
  grešku, auth-errors po `error.code`, split TodayPage/GuidedRunPage, kalendar `data-testid`,
  plan-generator test gapovi.

## v1.3 — lokalizacija, arhitekturalni review, nove feature

**L — Lokalizacija:** i18next + react-i18next; **sr (default) + en**; 11+1 namespaces, ~500 ključeva;
jezik se bira u Settings („Jezik") ili prati sistem; datumi/vreme kroz Intl po jeziku; `workoutTitle`
renderuje naslove treninga iz strukture (lokalizovano, i za postojeće planove); shared generisani
sadržaj (explain/coach/fueling/raceday/guided cue-ovi) vraća `LocalizedText` ključeve; TTS govor
prati izabrani jezik. Ograničenje v1: imena vežbi snage ostaju u jeziku generisanja plana.

**R — Arhitekturalni review (6 agenata, `docs/review/01-06` + `SUMMARY.md`):** popravljeni svi
P0/P1 — lokalni `todayIso` (UTC bug), transakcioni `log_workout` i `scale_week_volume` RPC-ovi,
Settings single-save tok, weather invalidacija pri promeni grada, `predict` guard + stroža PB
tolerancija (±0,4%), konsolidovani date helperi, `PlanFields` dedupe (~200 linija), onboarding
atomičnost (RPC postavlja `onboarding_completed`), AppModal refokus, GPS bez fixa ne upisuje
lažnu distancu, error handling na mutacijama, `_headers` (geolocation + avatari), šifrovan backup,
CI job za validaciju migracija, E2E mock geocoding (nema živih API poziva u testovima).

**F — 3 nove feature:**

- **Gamifikacija**: 9 familija / 20 nivoa bedževa + nedeljni izazov + diskretna proslava (toast);
  sve izračunato iz postojećih podataka (bez šeme).
- **Profil & social**: avatar upload (Supabase Storage, canvas resize), opcioni javni profil,
  **nedeljna rang lista** (`/leaderboard`, security definer RPC, opt-in).
- **Benchmark + recalibracija**: test trka (5K/10K) sa tajmerom → predlog novih tempa (staro vs
  novo po zoni) → prihvatanje menja `plans.paces`/`anchor` i buduće korake treninga (`recalibrate_plan` RPC).

Bundle: **252 kB / 80 kB gzip** (sa početnih 742 kB / 212 kB).

## v1.2 — dizajn refresh, plan recalibracija, 3 nove feature

**T1 — Dizajn + light/dark:** 3 audita (`docs/design/01-pages-audit.md`, `02-system-tone-audit.md`,
`03-theming.md`) → redizajn svih strana po referencama (Runna/Strava/NRC/Garmin/Apple Fitness),
novi primitivi (ListRow/SectionHeader/StatRow/StatTile/WorkoutTypeIcon), tipografska skala
(`--text-hero/stat/label` + `num`/`section-label`), prepis ~30 UI stringova u topliji coaching ton,
**light/dark tema** sa sistemskom preferencijom, brzim header toggle-om i Settings sekcijom „Izgled"
(theme-init.js bez FOUC, bez CSP izmena). Usput popravljen i polomljen izgled „Nedeljni kilometri"
chart-a za nove korisnike.

**T2 — Plan generator (long-run-first):** realni volumeni po uzoru na Higdon/Pfitzinger/Runna —
lt20+maraton sada 20 → 55 km/ned sa long run-om do **30 km** (ranije 15 → 40 / 12,8 km); 20-40 → 62;
40-60 → 82; gt60 → 100; long run ciljevi po distanci (M 30-34, HM 18-21, 10K 10-12, 5K 6-8);
`first` cap 60 km/ned & 30 km long; cutback svake 4. nedelje, pik long run-a 3 nedelje pre trke,
taper 0,80/0,60/0,40. Bezbednosni invarianti (rast ≤ max(danа,10) km/ned) ostaju.

**T3 — 3 nove feature:**

- **Race-day strategija** (`/race-day`): plan tempa sa 5 km splits tabelom (even/negative split
  toggle), weather-aware napomena za dan trke, interaktivna checklist-a (localStorage).
- **Fueling & hidratacija**: FuelingCard na detalju treninga (pre/tokom/posle, gel raspored,
  hidratacija po temperaturi) + audio/visual gel cue-ovi u vođenom trčanju (dugi trkovi),
  toggle u Settings.
- **Kalendar sync**: „Izvezi plan (.ics)" u Settings (svi non-REST treninzi, floating local times,
  stabilni UID-ovi) + „Dodaj u Google kalendar" po treningu.

Bundle: glavni chunk smanjen 567 → 353 kB (111 kB gzip) zahvaljujući redizajnu i lazy rutama.

## v1.1 — 5 Runna-inspirisanih feature-a

Svaki feature je prošao faze istraživanje → plan → arhitektura → implementacija → testovi;
dokumentacija u `docs/features/0N-*/` (+ `docs/features/CONTRACTS.md` sa zajedničkim pravilima).

| #   | Feature                       | Šta radi                                                                                                                                                              | Ključni fajlovi                                            |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| F2  | **Snaga & mobilnost u planu** | 2 strength sesije nedeljno (fazno prilagođene, bez pliometrije za početnike), zamenjuju REST dane; taper/race-week pravila; „Završi trening" bez run log-a            | `shared/strength.ts`, migracija `strength_workout_type`    |
| F1  | **Vođeno trčanje**            | Audio (TTS + beep) vođenje korak-po-korak kroz trening, monotonic clock otporan na throttling, wake lock, opcioni GPS, auto-log na kraju; `?timeScale` test hook      | `shared/guided.ts`, `GuidedRunPage`, `components/guided/*` |
| F5  | **„Zašto ovaj trening"**      | Za svaki tip × fazu: svrha, izvođenje, česta greška, effort (RPE) cue — na detalju treninga                                                                           | `shared/explain.ts`, `WhyCard`                             |
| F3  | **Prediktor + lični rekordi** | Predviđeni 5K/10K/HM/M iz VDOT-a (bisection), auto-PB iz logova (±2% tolerancija), feasibility hint u onboardingu                                                     | `shared/predict.ts`, `PredictorCard`, `PersonalBestsCard`  |
| F4  | **Adaptivni trener**          | Nedeljni recap + rule-based uvidi (propušteni treninzi, RPE drift, adherencija) sa one-tap skaliranjem sledeće nedelje (guardrails: nikad RACE, floor 2 km, 0.6–1.15) | `shared/coach.ts`, `CoachInsightsCard`, `useScaleWeek`     |

Napomena: `races.distance_km` je `numeric(4,2)` (42.195 → 42.20) — prediktor koristi toleranciju
0.01 km; bez šeme menjanja.

## Bezbednost (stanje)

- **DDoS:** Cloudflare L3/4 + L7 HTTP DDoS zaštita je **always-on za sve planove** (uključena i za
  `*.pages.dev` bez ikakve konfiguracije). Verifikovano u CF dokumentaciji.
- **Sigurnosni headeri (live, verifikovani na produkciji):** `Content-Security-Policy` (allowlist:
  self + `*.supabase.co` + Open-Meteo hostovi; `frame-ancestors 'none'`), `Strict-Transport-Security`,
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Supabase:** RLS na svih 5 tabela (`user_id = auth.uid()`), FK-vlasništvo provereno u policy-jima,
  trigger funkcije skinute sa javnog RPC pristupa, security advisori **0 upozorenja**, auth rate
  limits ugrađeni u platformu, email potvrde ON u produkciji. Anon ključ je javan po dizajnu (štiti RLS).
- **GitHub Actions:** least-privilege `permissions` u svim workflow-ima; secrets (Supabase URL/ključ)
  se ne prosleđuju PR-ovima iz forkova.
- **Repo je trenutno javan** (`github.com/AndrejKaravida/runcast`): u njemu nema tajni (`.env.local`
  je ignorisan, anon ključ je javan po dizajnu), ali po želji prebaci na private u repo settings.
- **Šta nije moguće na `*.pages.dev`:** WAF managed rules, rate limiting pravila i Bot Fight Mode
  zahtevaju custom domen kao Cloudflare zonu (free plan tada daje Bot Fight Mode; WAF/rate limiting
  su plaćeni tier-ovi). Ako zatreba: dodaj domen → zone → Security pravila. Za abuse na auth-u
  Supabase podržava Turnstile CAPTCHA (dashboard toggle).

## Poznati sledeći koraci

- Google login (Supabase provider), notifikacije, mobilna app preko istog `packages/shared`.
- Apple design faza 2 (`docs/plans/design-apple.md` §4): `layoutId` pill za segmente/tabove,
  page tranzicije, scroll-edge maska.
- Opcioni E2E job u GitHub Actions (skica u `docs/plans/05-quality-infra.md`).
