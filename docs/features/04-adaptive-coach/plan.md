# F4 — Adaptivni trener: plan

## Obim

`CoachInsightsCard` na Stats strani: (1) nedeljni recap prošle nedelje (planirano vs urađeno km i broj treninga, najduži trk, realizacija %) i (2) do 3 insajta sa tonom `positive`/`warning`/`neutral`, svaki sa najviše jednom akcijom. Akcija skalira treninge **sledeće** nedelje (on/off, bez automatskog menjanja plana). Sve je izvedeno iz postojećih `workouts` + `run_logs`; bez šeme, RPC-ova, novih dependency-ja. Insajti se računaju u pure `coach.ts` (F4 vlasnik), primenjuju kroz novu `useScaleWeek` mutaciju.

## Pravila (uslov → insajt → akcija)

| #   | Uslov                                                                                                                                   | Ton      | Naslov                                            | Akcija                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------- | ------------------------------------------------- |
| R1  | ≥2 run treninga (ne RACE) sa statusom ≠ DONE i datumom pre danas u poslednjih 14 dana                                                   | warning  | „Propustio si N treninga u poslednje dve nedelje” | `scale 0.8` — „Smanji sledeću nedelju 20%”        |
| R2  | avg RPE poslednjih 5 run logova (sa RPE, do danas) ≥ 8.5                                                                                | warning  | „RPE je visok (prosek X)”                         | `scale 0.9` — „Smanji 10%”                        |
| R3  | avg RPE poslednjih 5 ≥ 7.5 i < 8.5, uz ≥3 loga sa RPE                                                                                   | neutral  | „RPE blago raste (prosek X)”                      | `scale 1.0` — „Ostavi kako je”                    |
| R4  | u prošloj nedelji (pon–ned) postoji LONG sa statusom ≠ DONE                                                                             | neutral  | „Dugi trk nije ispunjen”                          | `scale 1.0` — „Ostavi kako je” (bez kompenzacije) |
| R5  | realizacija poslednjih 14 dana (treninzi pre danas) ≥ 90%, imenilac ≥3 run treninga (uključujući SKIPPED), avg RPE ≤ 6 i ≥3 loga sa RPE | positive | „Sve po planu — možeš malo više”                  | `scale 1.1` — „Povećaj 10%”                       |

Prioritet/supresija: R1 gasi R3 i R5; R2 gasi R3 i R5; R3 gasi R5; R4 je nezavisan (može uz jedan od R1–R3). Maks 3, sortirano R1→R5. Ako nijedno pravilo ne opali uz podatke → bez insajta (samo recap + „Sve izgleda stabilno.”). Bez podataka → prazno stanje kartice.

## Guardrails za akciju

- Ciljna nedelja = `startOfWeek(today) + 7`; akcija se **uklanja** ako: nedelja počinje posle `raceDate`, u njoj postoji RACE (race week), ili u njoj nema ni jednog skalabilnog treninga (PLANNED, tip ≠ REST/STRENGTH/RACE).
- Skaliraju se isključivo **PLANNED** run treninzi (EASY/LONG/TEMPO/INTERVALS/REPETITIONS), nikad RACE, STRENGTH, REST, DONE, SKIPPED, niti datum < danas.
- `factor` se klampuje u `[0.6, 1.15]` već u `coach.ts`; faktori pravila: 0.8 / 0.9 / 1.0 / 1.1 (1.0 = no-op akcija, samo „primećeno”, troši apply za tu nedelju).
- `distance_km = max(2, round1(km × factor))` — pod 2 km se ništa ne skalira.
- Jedan apply po nedelji: posle uspešne akcije upisuje se `localStorage['runcast.coach.applied']` (mapa `weekStart → factor`); sve akcije za tu nedelju se sakriju, ostaje tekst „Nedelja od DD.MM. je prilagođena.”
- Akcija ostaje dostupna samo dok je ciljna nedelja u budućnosti (nedelja posle tekuće).

## Kriterijumi prihvatanja

1. Unit (`coach.test.ts`): svako R1–R5 pali/gasi pod krojenim fixture-ima; prioritet/supresija; recap matematika (planirano/urađeno km i sesije, najduži DONE run, realizacija zaokružena, prazni nizovi → nule). Bez podataka → `insights: []`.
2. Race week: RACE u ciljnoj nedelji → insajti bez `action`; plan koji se završava tekuće nedelje → bez akcija.
3. Mutacija: primenom faktora 0.8 na nedelju od 7 dana menjaju se samo PLANNED run stavke u toj nedelji; `distance_km` po formuli, naslov EASY/LONG dobija novi km („Lako trčanje 6,4 km”); DONE/SKIPPED/RACE/REST/STRENGTH i tekuća nedelja netaknuti; faktor van opsega se klampuje; `factor 1.0` → 0 izmena.
4. Stats: kartica je vidljiva ispod 4 pločice, a iznad „Nedeljni kilometri”; postojeći selektori `Realizacija`, `Poslednje zabeleženo`, `50:00` i dalje prolaze; nema horizontalnog overflow-a na 320px.
5. Plan: posle apply, `week-row` count = 7 i jedinstveni datumi ostaju; `a[aria-label*="Dugi trk"]` postoji i dalje.
6. E2E (`app/e2e/coach.spec.ts`, novo): insajt vidljiv; klik na akciju → potvrda → naslovi/km u ciljnoj nedelji se menjaju na `/plan`.
7. `npm run typecheck`, `npm run test`, `npm run lint -w app`, `cd app && npx playwright test` zeleni.

## Srpski copy

- Sekcija: `Prošla nedelja`; `Planirano: X km · N treninga`; `Urađeno: X km · N treninga`; `Najduži trk: X km` (bez trka: `Najduži trk: —`); `Realizacija: N%`.
- R1: `Propustio si N treninga u poslednje dve nedelje. Sledeća nedelja je lakša da se vratiš u ritam.`
- R2: `Poslednjih pet treninga traži mnogo od tebe (prosek RPE X). Uzimamo korak nazad.`
- R3: `Prosečan RPE je X — malo više nego ranije. Volumen ostaje isti dok se ne stabilizuje.`
- R4: `Prošle nedelje dugi trk je izostao. Ne nadoknađujemo kilometre — sledeća nedelja ostaje po planu.`
- R5: `Realizacija X% i nizak RPE (prosek X). Sledeća nedelja ide +10%.`
- Bez insajta: `Sve izgleda stabilno — nastavi ovako.`; uspeh: `Nedelja od DD.MM. je prilagođena.`; greška: `Nije uspelo — pokušaj ponovo.`
- Dugmad: `Smanji sledeću nedelju 20%`, `Smanji 10%`, `Ostavi kako je`, `Povećaj 10%`.

## Van obima

- Automatsko menjanje plana bez klika; više akcija po insajtu; undo; sync „applied” stanja preko baze/uređaja.
- Izmene `PlanPage`, `WorkoutPage`, `TodayPage`, plan-generatora, šeme i RPC-ova.
- Skaliranje steps/distanca po koraku (v1 menja `distance_km` + naslov); izmene `steps` su otvoreno pitanje za iteraciju 2.
- Finansije/memberships, notifikacije, trener-revenue izveštaji.
