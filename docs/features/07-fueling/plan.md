# F7/R2 — Plan: Gorivo i hidratacija

## Gde i kada — FuelingCard (WorkoutPage)

- Nova `FuelingCard` u `WorkoutPage.tsx`, odmah posle `WeatherSummaryCard` (kartica koristi
  `apparentC` iz istog `useWeather()` izvora), pre akcionih dugmadi.
- Prikaz: `workout.type === 'LONG'` uvek; `RACE` uvek (trka je ključan dan za gorivo);
  `TEMPO` samo kada je izračunato trajanje ≥ 75 min; EASY/INTERVALS/REPETITIONS/STRENGTH/REST ne.
- Vidi se i za PLANNED i za DONE trening (za DONE je čitanje, bez akcija); kod statusa se
  ne menjaju postojeći selektori (`Urađeno`, `Preskoči`, `Koraci`).
- Ako plan nema `paces`, trajanje iz `buildStepTimeline` je procena — kartica i dalje radi;
  ako timeline nema segmente (`NO_STEPS`/`NOT_A_RUN`), kartice nema.
- Bez vremena: ako `workout_date` nije budući ili weather nema podatke → hidratacija bez
  brojeva (°C), ostalo isto.

## Sadržaj kartice (srpski, kratko)

- Naslov sekcije: „Gorivo" + `SectionHeader`, tri bloka:
  1. **Pre treninga** — obrok 2–3 h pre starta; tačno vreme iz `runWindowHours(profile.run_window)`
     (jutro start 6 → „obrok do 07:00"; veče start 17 → „obrok do 15:00"; fleksibilno bez sata).
     Snack pred polazak 25 g UH / 60–90 min 50 g UH / > 90 min 75 g UH.
  2. **Tokom** — broj i vremena gelova iz trajanja: prvi na 40 min, pa svakih 35 min, poslednji
     najkasnije 10 min pre kraja; uz svaki gel „~200 ml vode". Voda: 400–800 ml/h po temperaturnom
     pojasu osećaja (< 5 → 400–500; 5–15 → 500–600; 15–25 → 600–700; > 25 → 700–800 + elektroliti).
  3. **Posle** — protein + UH u roku od 1–2 h (npr. čokoladno mleko, jogurt + voće); rehidratacija
     uz natrijum. Ako je trening danas završen, blok isti tekst „u roku od 1–2 h".
- Primeri: „Obrok do 07:00 — pasta/ovsena kaša, malo masti i proteina.", „Gel 1 na 40. min,
  gel 2 na 75. min — svaki uz ~200 ml vode.", „Osećaj 27° → 700–800 ml/h + elektroliti."
- Vrućina menja copy: „Vruće je — na svakih ~30 min gel i više vode." (usklađeno sa Runna savetom).
- Bez novih UI primitive: `AppCard` + `SectionHeader` + postojeći `num`/`text` stilovi.

## Guided integracija (GuidedRunPage — extend, ne rewrite)

- Dodatni cue-ovi samo za `LONG`: gel/voda na 40 min pa svakih 35 min (isto kao kartica).
- Govor (postojeći `speech.speak`): „Vreme je za gel — popij vodu."; u vrućini (≥ 25 °C osećaj):
  „Vruće je — popij vodu i uzmi gel."
- Vizualno: umesto diranja `guided-cue` bannera (guided.spec.ts čita „Sada"/„Pauza"/„Ponavljanje"),
  nova linija u sesijskoj kartici: pre cue-a „Sledeći gel: ~12 min", posle cue-a „Vreme je za gel —
  popij vodu." (`data-testid="guided-fueling"`). `guided-cue` logika ostaje netaknuta.
- Cue se emituje preko `clock.elapsedSec` (poštuje `timeScale`); `Set` ref čuva šta je odzvonilo,
  seek nazad ne ponavlja isti cue.
- Toggle OFF → cue-ovi i linija se ne prikazuju; ostala vođenja rade identično.

## Settings — „Podsetnici za gorivo"

- Sekcija **Trening**, u postojećem `AppCard`, ispod „Deo dana za trening"; `SegmentedControl`
  „Uključeno / Isključeno" (bez novog UI primitive, bez profile polja).
- localStorage `runcast.fueling`, default ON; čita se jednom pri montiranju (state initializer);
  OFF uklanja samo guided cue-ove, FuelingCard ostaje (informativna).

## Acceptance criteria

- [ ] LONG workout → „Gorivo" kartica sa sva tri bloka i brojevima gelova iz trajanja.
- [ ] TEMPO < 75 min → nema kartice; TEMPO ≥ 75 min i RACE → ima.
- [ ] Pre blok prikazuje vreme obroka vezano za `run_window` (jutro/veče/fleksibilno).
- [ ] Voda po pojasevima `apparentC` (400–500 … 700–800 ml/h); bez podataka → tekst bez brojeva.
- [ ] Guided LONG sa `?timeScale=120`: posle 40 min sim vremena `guided-fueling` sadrži „gel".
- [ ] `guided.spec.ts` selektori netaknuti (`guided-cue`, `guided-elapsed`, `guided-next`…).
- [ ] Toggle „Podsetnici za gorivo" upisuje `runcast.fueling` i OFF sklanja guided cue-ove.
- [ ] `npm run typecheck`, `npm run test`, `npm run lint -w app`, `npx playwright test` zeleni;
      bez novih dependency-ja i bez izmena šeme/baze; 320px bez overflow-a.

## Out of scope

- Personalizacija po težini/rodu (koristimo trajanje i temperaturu, ne g/kg).
- Brojanje unetih gelova, notifikacije van app-a (push), istorija fueling-a.
- Izmene Stats/finansija, plan-generatora, baze; mala slova/ćirilica van postojeće latinice.
- RACE guided vođenje (RACE nije u `GUIDED_RUN_TYPES`) — kartica da, cue-ovi ne.

## Rizici

- Previše cue-ova na dugom trku → spajamo vodu u gel cue; maksimalno 1 cue / 35 min.
- E2E trajanje: prvi gel na 40 min sim = 20 s wall uz `timeScale=120` → poll timeout 30 s.
- Procenjeno trajanje (nema `paces`) menja broj gelova — prihvatljivo, kartica ne obećava tačnost.
