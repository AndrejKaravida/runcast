# F13 — Konkurentska analiza: gde RunCast zaostaje (2026)

Izvor: istraživanje tržišta (Runna, Nike Run Club, Garmin Coach, Strava, TrainingPeaks, Hal
Higdon, adidas Running, 80/20, COROS, Polar Flow, McMillan, Trenara, V.O2, Kiprun). Stanje
RunCast-a: v1.6 + launch compliance.

## 1. Matrica (Y = ima, p = delimično, - = nema)

C1 plan gen · C2 izmena/pomeranje sesija · C3 promena trke/više trka · C4 adaptivno na
performanse · C5 vreme/tereni · C6 live tracking + audio · C7 workout na sat · C8 social ·
C9 izazovi · C10 Health import · C11 test + predikcija · C12 cena

| App            | C1  | C2  | C3  | C4  | C5    | C6  | C7  | C8  | C9  | C10 | C11 | C12         |
| -------------- | --- | --- | --- | --- | ----- | --- | --- | --- | --- | --- | --- | ----------- |
| Runna          | Y   | Y   | Y   | Y   | Y     | Y   | Y   | p   | p   | p   | Y   | $19.99/mo   |
| Nike Run Club  | Y   | p   | p   | p   | -     | Y   | p   | Y   | Y   | Y   | p   | free        |
| Garmin Coach   | Y   | p   | Y   | Y   | -     | Y   | Y   | p   | Y   | Y   | Y   | free uz sat |
| Strava         | p   | p   | p   | p   | -     | Y   | p   | Y   | Y   | p   | Y   | $11.99/mo   |
| TrainingPeaks  | p   | Y   | Y   | -   | p     | p   | Y   | p   | p   | Y   | Y   | $19.95/mo   |
| Hal Higdon     | Y   | Y   | Y   | Y   | -     | p   | p   | -   | p   | -   | p   | $6.99/mo    |
| adidas Running | Y   | p   | p   | p   | -     | Y   | p   | Y   | Y   | Y   | p   | $9.99/mo    |
| 80/20          | p   | p   | p   | p   | -     | -   | Y   | p   | -   | p   | Y   | $16.58/mo   |
| COROS          | Y   | Y   | p   | Y   | p     | Y   | Y   | p   | p   | Y   | Y   | free uz sat |
| Polar Flow     | Y   | Y   | p   | Y   | -     | Y   | Y   | p   | p   | Y   | Y   | free uz sat |
| McMillan       | Y   | Y   | Y   | p   | Y     | p   | Y   | p   | -   | p   | Y   | $39.99/mo   |
| Trenara        | Y   | p   | p   | Y   | p     | -   | p   | -   | -   | Y   | Y   | €3.99+/mo   |
| V.O2           | Y   | p   | p   | p   | -     | p   | Y   | p   | -   | Y   | Y   | $12.99/mo   |
| Kiprun Pacer   | Y   | Y   | p   | Y   | -     | p   | Y   | p   | p   | Y   | p   | free        |
| **RunCast**    | Y   | Y   | -/p | -   | **Y** | -   | -   | p   | Y   | Y   | Y   | TBD         |

## 2. Rangirane praznine (od najvažnije)

1. **In-run iskustvo (M, must-have)** — Runna/NRC/Strava/adidas snimaju GPS, auto-pause,
   intervale, splite, live pace vs cilj, audio cue-ove. Naš guided run je čitač + ručni log.
   → F14 live tracker.
2. **Workout na sat (M preko TCX/WorkoutKit, L pun, must-have)** — watch-first je 2026
   default. FIT/TCX export + Apple WorkoutKit prvo.
3. **Adaptivno poravnanje (M, must-have)** — Runna Plan Realignment posle 3 propuštena;
   imamo RPE, benchmark i prediktor, ali plan je generate-once. Rebalans volumena/pace-a.
4. **Snaga/mobilnost/cross-training (M, must-have)** — Runna bundluje S&C; sadržaj je
   glavni trošak (autorovanje), ne kod.
5. **Audio vođene sesije (S preko TTS, jak diferencijator)** — NRC-ovih 300+ audio trčanja
   su najhvaljeniji asset; TTS na uređaju (sr/en) bez produkcije.
6. **Social graf (M feed, L klubovi, nice-to-have)** — Strava drži feed/kudos; dovoljno:
   prijatelji + feed + kudos + friends-only rang lista. → F17.
7. **Readiness inputi (M, nice-to-have)** — HRV/body battery; opt-in, nikad tiho prepisivanje.
8. **Širina distanci (S–M, nice-to-have)** — 10K, post-race recovery, više trka odjednom.

## 3. Naši diferencijatori (gde da uložimo)

- **Weather-smart loop** (skorovi po danu + najbolji termin + auto reschedule) dublji od
  Runna „Adapt for Heat" i McMillan EnviroNorm (samo AI tier). Proširiti: prognoza na dan
  trke, vetar/kiša, heat-acclimation.
- **Adherence-based rang lista** — Strava/NRC rangiraju volumen; skor po pridržavanju plana
  (propisano vs urađeno + RPE iskrenost) je unikatan i leže na postojeći coach insights.
- **Benchmark → auto-rekalibracija** — V.O2 traži ručni „level up"; mi možemo automatski
  benchmark → pace targeti → prediktor (i to je najjeftiniji put do praznine #3).
- **Bilingvalno EN/SR + lokalni kontekst** (balkanske vrućine, domaće trke, cena).
- **No lock-in** — export podataka i Health izvoz kao trust win.

**Cena:** NRC/Garmin/COROS/Kiprun su besplatni; Runna $19.99/mo. Potreban pravi free tier
ili weather+adherence wedge pre naplate.

## 4. Plan implementacije (ovaj talas vs backlog)

Ovaj talas: F14 live tracker, F15 custom dani, F16 edit trke, scroll-to-top fix, F17 social
MVP. Backlog po prioritetu: watch export (TCX), adaptivno poravnanje, S&C sadržaj, TTS audio
sesije, readiness, širina distanci, više trka.
