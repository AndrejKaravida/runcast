# F7/R2 — Istraživanje: gorivo i hidratacija

## Metod

10 web upita: Runna podrška i guides (mid-run fuel, gelovi, pre/post-run, audio cues, toplota),
naučni konsenzusi (ACSM/AND/DC 2016, ACSM fluid 2007, IAAF 2019, IOC 2018), praktični gel protokoli,
hidratacija i efekat temperature. Cilj: brojevi i pravila za srpske tekstove kartice i cue-ova.

## Šta Runna radi

- „Workout Briefing" i nutrition hub daju opšte smernice; u samoj vođenoj trci audio cue-ovi su:
  start, pace alerts, pauza/nastavak, polovina, „Lap x in x", kraj — **nema namenskih gel podsetnika**
  (support.runna.com: setting-up-and-managing-your-audio-cues). To je naša diferencijacija.
- Long-run savet: „Plan Your Fuel" — doručak sa sporim UH, gelovi/sladkiši tokom, voda u pakovanju,
  planiran post-run obrok (banana/protein) (top-tips-for-enjoying-your-long-runs).
- U vrućini: povećati vodu/elektrolite pre/dok/posle, „Adapt for Heat" tempa; tokom trke u vrućini
  „consider increasing the frequency of gels or chews" (top-tips-for-running/racing-in-the-heat).

## Norme — pre treninga

- Obrok 2–3 h pre starta (doručak se „slegne"): 1–4 g UH/kg telesne mase, malo proteina/masti;
  obrok je obavezan za napore > 60 min (ACSM/AND/DC 2016; DGE 2020 position stand).
- Runna „pre-run fuel by time on feet": < 60 min 25+ g UH; 60–90 min 50+ g UH + 5–10 g proteina;
  > 90 min 75+ g UH + 5–10 g proteina (what-to-eat-before-and-after-a-run).
- ~500 ml tečnosti 2 h pre starta (ACSM 2007, Exercise and Fluid Replacement).

## Norme — tokom trčanja (gelovi)

- 30–60 g UH/h za napore 1–2,5 h; > 2,5 h do 90 g UH/h (ACSM/AND/DC 2016; IAAF 2019; Beelen 2015).
- Za < 60 min nije potrebno; 60–90 min opciono 1 gel; > 90 min obavezno (Mayo Clinic; Runna).
- Praktični ritam: prvi gel 30–45 min od starta, pa na ~30–40 min (Runna how-to-use-energy-gels;
  Runner's World „smaller doses every 30 minutes starting at the first half hour").
- Gel se **uvek pije uz vodu** (200–250 ml) — bez vode ostaje u želucu i pravi GI probleme
  (Runna how-to-use-energy-gels; Runner's World). Tipičan gel = 20–40 g UH → 1–2 gela/h pokriva normu.
- Vrućina smanjuje oksidaciju egzogenih UH ~20% čak i uz euhidraciju (J Appl Physiol 2025,
  heat stress) → u vrućini gušći raspored ili više izvora UH.

## Norme — hidratacija i temperatura

- Preporučeni unos tokom napora: **400–800 ml/h** (Armstrong 2021, Rehydration during Endurance
  Exercise — obe organizacije); ACSM 2007 za vežbanje daje 600–1200 ml/h uz 4–8% UH rastvor.
- Znojenje varira 400–2400 ml/h; raste sa temperaturom, vlagom, tempom i težinom (Runner's World
  hydration guide; CDC sweat rate). Ne prelaziti procenjeni sweat rate (rizik hiponatremije).
- Toplo (> ~25 °C osećaj): gornja granica unosa + elektroliti/natrijum (0,5–0,7 g Na/L za > 1 h,
  ACSM 2007); hladno (< 10 °C): donja granica. Runna: elektroliti bitni za > 60 min, vruće/vlažno,
  ili ako se vidi so na opremi (guide-to-electrolytes).
- Znak: žeđ kasni; piti po planu, ne po osećaju (RRCA: 10–15 oz svakih 20–30 min u vrućini).

## Norme — posle trčanja

- „Recovery window": raniji unos ubrzava oporavak; za treninge ≥ 90 min praktično u prvih 1–2 h
  (Mayo: „within the first two hours"; Runna: snack za 30–45 min).
- Snack: ~10 g proteina + 30 g UH (Runna); obrok 20–25 g proteina + 1–1,2 g UH/kg u prva 2 h
  (Mayo Clinic News Network). Čokoladno mleko je klasičan praktičan izbor.
- Rehidratacija: ~1,5 L po kg izgubljene mase, sa natrijumom (ACSM 2007; Runna electrolytes).

## Zaključci za naš sadržaj

- Tri bloka: pre (2–3 h pre starta, vezano za `run_window`), tokom (gel na ~40 min pa svakih ~35 min
  - voda iz temperature), posle (protein+UH u 1–2 h).
- Brojevi iz plana: ukupno trajanje iz `buildStepTimeline`, `apparentC` iz `weather.data.hours`
  u prozoru treninga (isti izvor kao WeatherSummaryCard).
- Srpski, kratke naredbe: „Vreme je za gel — popij vodu.", „Posle trčanja: protein + UH u roku od sat."
- Ton kao WhyCard: mirno, konkretno, bez fiziologije; temperatura menja samo brojeve za vodu.

## Izvori

- support.runna.com: mid-run-snacks-and-drinks, what-to-eat-before-and-after-a-run,
  top-tips-for-enjoying-your-long-runs, runna-s-race-day-nutrition-checklist,
  setting-up-and-managing-your-audio-cues, top-tips-for-running-in-the-heat,
  top-tips-for-racing-in-the-heat, runna-s-guide-to-electrolytes
- runna.com/guides/how-to/how-to-use-energy-gels
- ACSM/AND/DC Joint Position Stand: Nutrition and Athletic Performance (2016, MSSE 48(3):543-68)
- ACSM Position Stand: Exercise and Fluid Replacement (2007)
- IAAF Consensus Statement 2019: Nutrition for Athletics (ijsnem.2019-0065)
- Beelen et al. 2015, Carbohydrate intake during exercise (PubMed 25970669)
- Armstrong et al. 2021, Rehydration during Endurance Exercise (PMC8001428): 400–800 ml/h
- J Appl Physiol 2025: Heat stress impairs exogenous CHO oxidation during running (PMID 41138215)
- Mayo Clinic Health System / Mayo Clinic News Network: fueling your run, feeding recovery
- Runner's World: how-to-eat-during-long-runs, complete hydration guide, how-to-train-with-energy-gels
- Hüma/truefuels praktični vodiči (prvi gel 30–45 min, pa 20–40 min) — komercijalni, potvrda norme
