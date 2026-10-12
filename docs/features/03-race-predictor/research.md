# F3 — Prediktor trke + lični rekordi: istraživanje

Cilj: predviđena vremena 5K/10K/HM/M iz postojećih podataka plana + detekcija ličnih rekorda iz
`run_logs` + hint o realnosti cilja u onboarding-u. Bez novih zavisnosti i bez izmena šeme.

## 1. Runna — kako prikazuje predikcije

- Jedan „estimated current race time" (5K/10K/HM) koristi se za sve distance; izmena jedne vrednosti
  automatski pomera ostale procene (support.runna.com/6205998).
- Prikazuje raspon (npr. „3:13–3:21"), u „Plan Introduction" i na Race treningu; procena je namerno
  konzervativna, uz pretpostavku ravnog terena i dobrih uslova (support.runna.com/6251445).
- Adaptacija ide kroz „Pace Insights": prate se samo speed sesije (intervali/tempo/time trial),
  easy/long ne menjaju procenu; predloge korisnik ručno prihvata u koracima 15–30 s
  (support.runna.com/14656203, /10854865). Na r/runna korisnici prijavljuju 5–8% optimizma nakon
  kratkih intervala (npr. HM procena 1:32 posle 5 nedelja iz pauze).
- Runna ne podržava treniranje ka ciljnom vremenu; filozofija je postepeni napredak, cilj se ručno
  koriguje; nema procene za „New to Running" tipove planova (support.runna.com/6205998).
- Za nas: prikazujemo 4 odvojena predviđena vremena + kratku „confidence" notu; ne učimo iz logova
  (to je F4 domen) i ne prikazujemo raspon. Konzervativnost je odlika, ne bug.

## 2. Daniels VDOT — ekvivalencija i inverzija

- Formule su već u `packages/shared/src/vdot.ts:3-21`: vo2(v) = −4.6 + 0.182258v + 0.000104v²,
  %VO2max(t) = 0.8 + 0.1894393e^(−0.012778t) + 0.298958e^(−0.1932605t), VDOT = vo2/%VO2max.
- Predikcija je isti račun u nazad: za datu distancu traži se t tako da VDOT(t) = ulazni VDOT. Ne
  postoji zatvorena forma (t ulazi i u brzinu v = d/t i u %VO2max(t)), pa je numerički root-find
  neophodan; Daniels je tabele pravio Newton–Raphson iteracijom (vivamarathon.com/OxygenPower.htm),
  a javni kalkulatori danas koriste bisection (nutilz.com/vdot-calculator). f(t) je monotono
  opadajuća u t (provereno numerički za 1800–28800 s na sve 4 distance), pa je bisection sa ±1 s
  robustan i ne zahteva početnu procenu.
- Validnost: procena važi uz adekvatnu pripremu za ciljnu distancu; isti VDOT ne znači isti profil
  (speed vs endurance) — ekstrapolacija kratko→dugo je optimistična za brze trkače i pesimistična za
  izdržljive (run-motion.com/vdot-calculator-jack-daniels). Tačnost je ~1–3% kada su distance u
  odnosu 2–4×, a opada sa razlikom distanci (runnersworld.com/advanced/a20836392,
  novacalculator.com race-predictor); kalkulatori se međusobno razilaze (isti 18:00 5K → maraton
  2:52–2:56), a Godwin preporučuje ±5 s/mi rezervu. Uslovi: ravan teren, vreme, vetar, nadmorska visina.
- Naše formule se poklapaju sa objavljenim tabelama: VDOT 50 → 5K 19:56, 10K 41:20, HM 1:31:32,
  M 3:10:40 (whynot.run/tools/race-equivalency tabela) — provereno numerički (odstupanje ≤2 s).
- Za nas: predikcija je „best-guess", nota mora da kaže da greška raste sa razlikom distanci.

## 3. Riegel formula

- t2 = t1 × (d2/d1)^1.06 (standard; originalni eksponent 1.07732; k varira 1.05–1.12 po profilu —
  Riegel: 1.08 elite, 1.05–1.06 rekreativci; Purdy 1.07).
- Vickers & Vertosick 2016 (N=2303, exa.ai/library/publication/gq7nhny0z1s): Riegel je dobro
  kalibrisan do HM, ali potcenjuje vreme maratona (≥10 min prebrzo za pola trkača). Zato je Riegel
  samo sekundarna utilita (test cross-check), dok je primarni prediktor VDOT.
- Tačnost ~3–5% za odnos distanci 2–3×; referentna trka mora biti maksimalni napor na ravnom.

## 4. Detekcija ličnih rekorda

- Strava „Best Efforts" = najbrži GPS segment unutar aktivnosti (elapsed time), traži kvalitetan
  GPS; ručni unosi i treadmill ne dobijaju PR (support.strava.com/15401661).
- Naši `run_logs` su agregati (distance_km, duration_sec, bez stream-ova), pa je moguće samo
  poređenje cele aktivnosti sa standardnom distancom uz toleranciju: Athlytics koristi ±2%
  (docs.ropensci.org/Athlytics), RunBests „bracketing" sa marginom naviše (runbests.appstor.io),
  HAID: strogo brže zamenjuje, izjednačenja ne (haid.app/docs), Tempo filtrira nemoguće brze segmente.
- Za nas: prozor ±2% po standardnoj distanci (5/10/21.0975/42.195 km), ceo log, bez segment
  extraction; dokumentovana aproksimacija (5.05 km se računa kao 5K, 5.3 km se ignoriše).
- Napomena: 5 km prozor [4.90, 5.10] sam po sebi isključuje logove <3 km — pravilo „<3 km" je
  odbrambeno i pokriveno testom.

## 5. Poruke o realnosti cilja

- Outrunr lestvica: do 3% = ostvarivo, 6% = stretch, 10% = ambiciozno, >15% van jednog bloka
  (outrunr.com.au/tools/goal-time-calculator).
- RunCulture: statusi „within reach" / „too ambitious" + konkretne opcije (više nedelja, dan više,
  kraća trka kao stepenica) (runculture.com/news/new-plan-engine).
- Strava ne računa elevaciju/fueling; treneri za prvi nastup na distanci dodaju 5–15 min
  (runnersworld.com/training/a69851468).
- Za nas: dve kategorije sa pragom 3% (realno/ambiciozno), prikaz samo kada postoji zabeležen
  rezultat — cilj kao sopstvena referenca bi uvek dao „realno" i poruka je besmislena.

## 6. Numerička verifikacija (naš vdot.ts, skript van repo-a)

- Round-trip: `predict(d, vdotFromPerformance(d, t)) = t` tačno (±1 s) za 5/10/21.0975/42.195 km
  (testirano t: 15:00–4:26:40; greška 0.0000%).
- M-pace inverzija (paces.marathonSecPerKm → VDOT): vraćeni VDOT je sistematski niži od originala —
  VDOT 20: −0.1%, 40: −1.3%, 50: −2.1%, 60: −2.8%, 70: −3.5%, 90: −4.6%; monotono po VDOT.
  Invarijanta: predviđeni maraton = M pace × 42.195 (±1 s), pa se predikcija poklapa sa M tempom
  prikazanim u treningu. Uzrok: `pacesFromVdot` modeluje M kao fiksno 80% VO2max, dok Danielsova
  kriva na maratonskom trajanju daje ~81–82%.
- Neskalirane granice pretrage [1800, 28800] klipuju 5K čim je VDOT ≳ 31 (npr. VDOT 40 → 30:00
  umesto 24:06) — granice se skaliraju sa distancom (d/42.195). Pokrivenost: f(lo) ≈ 404–492,
  f(hi) ≈ 13.7–15.3, pa VDOT ∈ [20, 90] (clamp u `pacesFromVdot`) uvek ima koren u opsegu.

## 7. Ograničenja / rizici

- Predikcija ne zna pripremu, teren, vreme, fueling; zato „confidence" nota + konzervativan bias.
- PB se računa iz najviše 300 logova (`useRunLogs` limit) — prihvaćeno ograničenje v1.
- `plan.paces`/`plan.anchor` su `Json` u bazi → cast u app-u; nema schema izmena.
- `vdot.ts` se ne menja (nije u vlasništvu F3, a i ne treba).

## Izvori

- support.runna.com/en/articles/6251445, /6205998, /14656203, /10854865; reddit r/runna niti
- run-motion.com/vdot-calculator-jack-daniels; nutilz.com/vdot-calculator; vivamarathon.com/OxygenPower.htm
- runnersworld.com/advanced/a20836392; whynot.run/tools/race-equivalency; novacalculator.com race-predictor
- exa.ai/library/publication/gq7nhny0z1s (Vickers & Vertosick 2016); runnersworld.com/training/a69851468
- support.strava.com/en-us/articles/15401661; docs.ropensci.org/Athlytics; runbests.appstor.io; haid.app/docs
- outrunr.com.au/tools/goal-time-calculator; runculture.com/news/new-plan-engine
