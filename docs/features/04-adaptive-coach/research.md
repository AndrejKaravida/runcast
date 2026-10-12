# F4 — Adaptivni trener: istraživanje (Runna + sRPE)

## 1. Kako Runna adaptira plan (javno dostupno)

- Planove pišu treneri, algoritam ih personalizuje (izjava Runne, feb 2026): „plans are not created by AI… an algorithm then tailors and adapts those coach-designed plans based on progress, feedback and real-world performance”.
- **Runna AI (jul 2024)**: prati pace na speed sesijama i obaveštava da si „ahead / behind / on pace”; kartica je na Plan overview + push notifikacija. Ručno linkovani treninzi se ne računaju — samo započeti/završeni u app-u ili preko sata.
- **Plan Realignment** (support): popup na dnu Today/Plan, obično ponedeljak, kad fali >3 treninga ili cela nedelja (propušteno ostaviti _neoznačeno_). Opcije: preskoči propušteno i nastavi / prerasporedi u tekućoj nedelji / produži plan / rebuild do istog datuma / nastavi nepromenjeno uz upozorenje. Potvrda je nepovratna.
- **Not Feeling 100%** (support): 3–14 dana, retrospektivno do 7 dana; nivoi: Reduced difficulty / Easy & long only / Short easy only / No running; povratak Slowly / Balanced / Quickly; push dan pre kraja. Poruke: „This isn’t taking a step back. It’s training intelligently.”, „Adjust when you need to, and trust that you’ll come back stronger.”
- **Skip vs rearrange** (support): „Skip is for runs you’ve decided you won’t do. Rearrange is for runs you still intend to complete.” Za više propuštenih: „Runna will check in and help you get back on track with a plan that reflects where you are now, not where you were supposed to be.”
- **Pace targets** (support): estimated race time (ne ciljno vreme); male korekcije 15–30 s; „steady, structured progress… prevents overtraining and reduces injury risk”.
- Roadmap (Reddit, jun 2025): adaptacija oko propuštenih/dodatnih kilometara sa „smart mileage recommendations”; nivoi prilagođavanja pojedinačnih treninga; pre-run briefing.
- Runna je od aprila 2025. pod Stravom; i dalje se vodi kao odvojen app.

## 2. sRPE — jednostavan proxy opterećenja

- Foster (2001): `TL = RPE (1–10) × trajanje (min)` → proizvoljne jedinice (AU). Praktično, validno, jeftino; koristi se za sesiju, nedeljni blok i makrociklus.
- Fusco (2020), Pind (2021): sRPE raste sa nagomilanim umorom i kada HR/brzina to još ne pokazuju → rani signal pre pada performanse; preporuka: spojiti spoljašnje (km/min) i unutrašnje (sRPE) opterećenje za nedeljne promene.
- 10% pravilo potcenjuje stvarni skok opterećenja: kad volumen raste, sRPE-based promena je bila 7–18% veća od promene trajanja.
- ACWR „sweet spot” 0.8–1.3 ima najnižu incidenciju povreda; skokovi izvan (posebno >1.3 u jednoj nedelji) povezani su sa povredom u narednoj nedelji (meta-analize 2020 i 2025).

## 3. Propušteni treninzi — šta rade treneri

- Ne nadoknađivati: „You’re not going to try to make up time… not add more miles the next week… not add more intensity” (Baird, Runner’s World). Spojiti propušteno sa tekućim = tipičan load spike.
- 1–3 dana: preskoči i nastavi; 4–7 dana: korak nazad u progresiji, prvo easy; 2+ nedelje: start na ~50% pa +10–15%/ned, bez intenziteta 2–3 nedelje (pheidi.training).
- Posle propuštene nedelje treneri vraćaju na ~70–80% planiranog volumena (Miles, Endurance Unpacked); propušten long run iz prve polovine bloka se uopšte ne nadoknađuje.
- RPE raste pri istom tempu → ne dodavati volumen; kratak cutback/hold dok se ne stabilizuje (fatigue drift; Pind 2021 to potvrđuje merenjima).
- Komunikacija trenera: bez krivice, objasni _zašto_ i daj jednu konkretnu akciju.

## 4. Fraze koje vredi pozajmiti

- „This isn’t taking a step back. It’s training intelligently.” (Runna)
- „Consistency over weeks beats perfection over days.” (Runna)
- „The plan reflows, not restarts… You never see a wall of red missed workouts.” + predlog promena i prihvatanje na jedan tap (Miles) → osnova za jednu akciju po insajtu.
- „A few missed or reduced runs won’t undo your progress… adjust at the right time is often what keeps runners consistent.” (Runna)
- Runna „Not Feeling 100%” listovi su faktori, ne osećaji (npr. „sleep has frequently dropped below baseline”, „running feels harder than it normally does at the same effort”) → naši pragovi treba da budu brojivi (RPE prosek, adherence, propušteno).

## 5. Mapiranje na F4 pravila

- missed ≥2 u 14 dana → warning + `scale 0.8` (duh Plan Realignment-a + „ne nadoknađuj”).
- avg RPE poslednjih 5 logova ≥ 8.5 → warning + `scale 0.9`; 7.5–8.4 → neutral „hold” („running feels harder than usual”; Pind/Fusco).
- adherence ≥ 90% i avg RPE ≤ 6 → positive + `scale 1.1` (Runna „ahead of pace”; ostaje u ACWR 0.8–1.3 okviru).
- LONG propušten prošle nedelje → neutral nota bez kompenzacije (RW/pheidi).
- Jedan apply po nedelji + faktori unutar 0.6–1.15 = zaštita od naglih skokova; recap je „jedan pogled” kao Runna kartica na Plan overview.

## 6. Izvori

- Runna support: „Adjusting Your Estimated Race Time and Pace Targets” — support.runna.com/en/articles/6205998
- Runna support: „How to Use the Plan Realignment Feature” — support.runna.com/en/articles/10026375
- Runna support: „Not Feeling 100%” — support.runna.com/en/articles/13531498; „Feeling Unwell?” — .../12809806; „Minor aches and pains” — .../13225357
- Runna support: „How and When to Skip a Run” — .../15012850; „Training Calendar” — .../10137793
- Reddit r/runna: „Runna AI is here!” (jul 2024) — reddit.com/r/runna/comments/1ef3olr; „Roadmap Update” (jun 2025) — /comments/1l3ynt2
- TechRadar (28.02.2026): „Are AI training apps like Runna putting you at risk of injury?” — techradar.com/health-fitness/...
- Runner’s World: „How Does Missing a Workout Affect Your Run Performance?” (2026) — runnersworld.com/health-injuries/a71137696
- pheidi.training: „A Coach’s Guide to Getting Back on Track After Missing Training”
- Miles: „Missed a Week of Training?” — milesapp.run/guides/missed-week-of-training
- Foster i dr. (2001) session-RPE; Haddad i dr. (2017) Frontiers in Neuroscience 11:612 — frontiersin.org/articles/10.3389/fnins.2017.00612
- Fusco i dr. (2020) „Effect of Progressive Fatigue on Session RPE” — mdpi.com/2411-5142/5/1/15
- Pind i dr. (2021) „Increases in RPE Rating Predict Fatigue Accumulation” — frontiersin.org/articles/10.3389/fphys.2021.735565
- ACWR meta-analize: Maupin i dr. (2020) OAJSM; BMC Sports Sci Med Rehabil (2025) — link.springer.com/article/10.1186/s13102-025-01332-x
