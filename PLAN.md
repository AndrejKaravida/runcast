# RunCast — plan i status

Marathon training app koja povezuje VDOT (Jack Daniels) plan treninga sa vremenskom prognozom
i predlaže zamenu treninga unutar iste nedelje kada uslovi nisu dobri.

## Status

| Faza | Sadržaj                                                                                       | Status |
| ---- | --------------------------------------------------------------------------------------------- | ------ |
| 0–10 | v1: shared paket, Supabase šema, auth, onboarding, plan, danas, logovanje, E2E, deploy config | ✅     |
| 11   | Audit svih delova app-a (5 subagenata) → `docs/plans/01..05-*.md`                             | ✅     |
| 12   | P0/P1 ispravke po auditima (vidi „Ispravke" ispod)                                            | ✅     |
| 13   | Home dashboard sa widgetima (nedeljni progres, niz, countdown, sledeći trening, aktivnosti)   | ✅     |
| 14   | Apple-style design pass → `docs/plans/design-apple.md`                                        | ✅     |
| 15   | E2E proširen na 7 scenarija                                                                   | ✅     |

Testovi: **64 unit** (shared) + **7 E2E** (Playwright kroz pravi UI) + typecheck/lint/build.

## Struktura

```
runcast/
  app/                 # Vite SPA (React 19, Tailwind v4, React Router 8, TanStack Query, Motion)
    src/auth/          # AuthProvider (cache hygiene), guards
    src/components/    # ui (Button/Card/Input/Badge/Modal(sheet)/ConfirmDialog/QueryError/ProgressRing/…)
    src/features/      # profile / plans (+ progress utils) / logs / weather
    src/pages/         # Login, Register, Reset, Onboarding, Today, Plan, Workout, Stats, Settings
    e2e/               # 7 Playwright scenarija
    public/_redirects  # SPA fallback (Cloudflare Pages)
    public/_headers    # sigurnosni headeri (CF Pages)
  packages/shared/     # pure TS: vdot, plan-generator, weather, weather-rules, schemas (+ 64 testa)
  supabase/            # config + migracije 0001 (šema/RLS) i 0002 (RPC-ovi, integrity)
  docs/plans/          # auditi 01–05 + design-apple.md
  .github/workflows/   # ci.yml, backup.yml, keepalive.yml
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

npm run test                # 64 unit testa
npm run typecheck && npm run lint
npm run test:e2e -w app     # 7 E2E (traži supabase start + dev server)
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

### Šta je ostalo ručno (zahteva tvoj nalog)

1. **Supabase auth URL-ovi (obavezno, 1 min):** Supabase dashboard → Authentication → URL
   Configuration →
   - Site URL: `https://runcast-2ju.pages.dev`
   - Redirect URLs: dodaj `https://runcast-2ju.pages.dev/**`
     Bez ovoga reset lozinke ne radi na produkciji. (MCP nema alat za auth config.)
2. **Backup (opciono):** `SUPABASE_DB_URL` kao **session pooler** string
   `postgresql://postgres.<ref>:<pw>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require`
   (ne direktni host — IPv6-only; ne port 6543). Backup pokriva `public` šemu, ne `auth` korisnike.
3. **Napomene:** Supabase free projekat se pauzira posle 7 dana bez aktivnosti (keepalive ping je već
   podešen sa secret-ima). Default SMTP ima mali dnevni limit — za produkciju razmotriti Resend.
   E2E u CI-ju nije uključen (zahteva `supabase start` u job-u); pokreće se lokalno.

## Poznati sledeći koraci

- Google login (Supabase provider), notifikacije, mobilna app preko istog `packages/shared`.
- Apple design faza 2 (`docs/plans/design-apple.md` §4): `layoutId` pill za segmente/tabove,
  page tranzicije, scroll-edge maska.
- Opcioni E2E job u GitHub Actions (skica u `docs/plans/05-quality-infra.md`).
