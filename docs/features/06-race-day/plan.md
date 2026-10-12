# F6 — Plan: stranica „Dan trke" (/race-day)

## Ulazi u stranicu

- Today chip (`race-chip`) → link „Dan trke →" kada `daysToRace >= 0` (chip ostaje isti AppCard).
- WorkoutPage, trening tipa `RACE` → sekundarni link „Strategija za dan trke".
- Ruta `/race-day` u `router.tsx` (RequireOnboarding, van TabLayout — back dugme kao WorkoutPage).

## Header (AppCard)

- Naziv trke, datum (`formatDateLong`), distanca; brojač: „X dana do trke" / „Danas je dan trke!" kad je 0.
- Ciljno vreme: `plan.races.goal_time_sec`; fallback `vdotFromPlan({ paces, anchor })` + `predictRaceTimes`
  za tu distancu; ako nema ni jedno → CTA „Postavi ciljno vreme" → `/settings` (bez pacing kartice).
- Vremenski note: samo ako je `race_date` unutar 7 dana (Open-Meteo horizont); `assessWorkoutWeather` sa
  `type: 'RACE'` + `raceWeatherNote` — savet je trkački (npr. „Kiša — anti-chafe i kapica"), bez „prebaci trening".

## Pacing kartica

- `SegmentedControl`: „Ravnomerno" (default) / „Negativni split" — lokalno stanje, bez mreže.
- Tabela `data-testid="pace-plan"`: 5K → 5×1 km; 10K → 2×5 km; HM → 4×5 km + 1,1 km; M → 8×5 km + 2,2 km.
  Kolone: deonica, tempo /km, vreme deonice, kumulativno vreme. Redovi `data-testid="split-row"`.
- Ispod tabele: „Ciljni tempo 5:20 /km (±3 s)" i `AppBadge` sa ciljnim vremenom.
- First-km nota po distanci:
  - M/HM: „Prvih 5 km 5–10 s/km sporije od cilja — čuvaj energiju za kraj."
  - 10K: „Prva 3 km ~5 s sporije, od 4. km ciljni tempo, zadnji km sve."
  - 5K: „Kontrolisano jako od starta, bez sprinta — zadnji km sve."
- Negativni split: prva polovina +2% tempa, druga −2%, ukupno vreme nepromenjeno; tabela se preračuna.
- Bez ciljnog vremena: kartica sakrivena, ostaju checklista i tips.

## Checklist kartica

- Tri grupe: „Veče pre", „Jutro", „Na stazi"; stavke iz `raceChecklist(distance_km)`.
- Interaktivni checkbox (native `input type="checkbox"` + label), progress „3/12" u headeru kartice.
- Perzistencija: `localStorage` ključ `runcast.raceDay.checklist.<race_date>`, JSON niz id-jeva; try/catch
  (privatni režim → radi bez perzistencije); vezano za trku, ne za korisnika.
- 5K/10K bez gelova; M/HM dobijaju gel/hidrataciju/drop-bag stavke.

## Final-week tips (tips kartica)

- 5–6 bulleta: taper (manje volumena, ostani šarp kroz kratka ubrzanja), probaj doručak i opremu, logistika
  (ruta, preuzimanje broja, drop-bag), ugljeni hidrati kroz porcije (bez prejedanja), šejkaut dan pre po želji,
  spavaj — dve noći pre su važnije od noći pre, „ništa novo na dan trke".

## Copy (srpski, primeri)

- Naslov: „Dan trke"; nazad: „Nazad"; toggle: „Ravnomerno"/„Negativni split"; CTA: „Postavi ciljno vreme".
- Sekcije: „Plan tempa", „Checklist", „Poslednja nedelja"; note: „Vetar — trči po naporu, ne po satu."

## Acceptance criteria

- [ ] `/race-day` dostupno sa Today chip-a i sa RACE treninga; `race-chip` i postojeći WorkoutPage selektori
      (`Koraci`, `Urađeno`, `Preskoči`, `start-guided`) netaknuti.
- [ ] Tabela splits za M/HM/10K/5K u obe strategije; suma kumulativa = ciljno vreme tačno; first-km nota vidljiva.
- [ ] Checklist checkbox preživi reload; ključ vezan za `race_date`.
- [ ] Vremenski note samo kad je trka u 7 dana; nikad ne predlaže swap treninga.
- [ ] 320px bez horizontalnog overflow-a; `npm run typecheck`, `npm run test`, `npm run lint -w app` zeleni;
      bez novih dependency-ja i bez migracija.
- [ ] `app/e2e/raceday.spec.ts` prolazi; app/responsive/guided/predictor/why specovi neizmenjeni.

## Out of scope

- Baza/migracije/RPC, `plan-generator.ts`, `queries.ts`; čuvanje checkliste na serveru (samo localStorage).
- Audio cues/GPS, Garmin sync, profil staze (brda) i automatsko prilagođavanje cilja po vremenu.
- Notifikacije/podsetnici, prevod postojećih strana, trenerski izveštaji.

## Open questions

1. Prozor za vremenski note: koristimo `run_window` iz profila (kao ostatak app-a) — start trke nije u šemi.
2. Distanca bez standardne dužine (npr. 15 km): segmentacija po pravilu ≥10 → 5 km, bez posebnog slučaja.
