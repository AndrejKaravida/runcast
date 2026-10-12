# 04 — Rekalibracija plan generatora: long-run-first model

Problem: lt20 (ispod 20 km/ned) maraton plan počinje na ~15, vrh 40 km/ned, dugi trk = 32% nedelje (max 12,8 km).
Realni beginnerski M planovi dostižu 30-32 km dugi trk i 55-65 km/ned. Ovaj dokument je istraživanje + predlog modela; bez izmena koda.

## 1. Izvori

| Plan (izvor)                                                                    | Obim              | Start → vrh km/ned                   | Peak dugi trk                  | Ključne brojke                                                     |
| ------------------------------------------------------------------------------- | ----------------- | ------------------------------------ | ------------------------------ | ------------------------------------------------------------------ |
| Hal Higdon Novice 1 M (halhigdon.com, running.org metric)                       | 18 ned, 4 trčanja | 24,1 → 64,4                          | 32,2 (ned 15)                  | stepback svaka 3. ned; taping 3 ned; 46,7/33,8/trka                |
| Hal Higdon Novice 2 M (halhigdon.com PDF)                                       | 18 ned, 4         | 30,6 → ~58                           | 32,2 (ned 15)                  | pace run srede; long 29 ned 11; stepback svaka 3. ned              |
| Pfitzinger 18/55 (Advanced Marathoning; anystride, runningwithrock)             | 18 ned, 5-6       | 53 → 88,5                            | 32-35 (20-22 mi)               | srednje-dugi 18-24 km; 3-ned taping; traži 40+ mi bazu             |
| Runna beginner M (support.runna.com, recenzije)                                 | 16-22 ned, 4      | ~30 → ~55-60                         | 32 (1-2×)                      | long +10-15%/ned; deload svakih 4-5 ned; plan ≤13 ned = kraći long |
| Garmin Coach (Garmin forumi, recenzije)                                         | 18-25 ned         | ~30-45                               | 22-24 (15 mi)                  | korisnici prijavljuju prekratak long; adaptivni load cap           |
| NRC M (nike.com PDF 2016, 18 ned)                                               | 18 ned, 5         | ~40 → ~75                            | 32-35 (20-22 mi)               | long raste do 20-22 mi ~5 ned pre trke                             |
| Higdon HM Novice 2 (halhigdon.com)                                              | 12 ned, 4         | 21 → ~34                             | 19,3 (12 mi)                   | 1-ned taping; long 6,4 → 19,3                                      |
| Daniels' Running Formula (levelrenner, runtofinish; sekundarno)                 | —                 | +1 km po treningu/ned, pauza 3-4 ned | ≤25-30% ned. ili ≤2,5 h        | T ≤10%, I ≤8%, R ≤5% ned. volumena                                 |
| Long-run share (strengthrunning, pace-perfect, fleetfeet, hillrunner)           | —                 | —                                    | —                              | 20-30% kod većeg volumena; 30-50% za početnike; long 18-22 mi      |
| Cutback (Runners World, marathonhandbook, Polar)                                | —                 | −20-30% svake 3-4 ned                | skraćen long                   | 3. i 6. ned Higdon N1                                              |
| Taper (Runners World, Polar, Ben Parkes, runners-digest)                        | 3 ned             | −20/25%, −40/50%, −60/70%            | poslednji long 21 dan pre trke | oštrina: 1 kvalitet do 10 dana pre trke                            |
| HM beginner planovi (sportcoaching, yearroundrunning, flipmp, marathonhandbook) | 12-16 ned         | 20-30 → 36-45                        | 18-20                          | intermediate 50-60/ned, long 18-19                                 |
| 10K planovi (trainingplan.dev, runsy, alastairrunning, run-r.org)               | 8-12 ned          | 15-20 → 30-45                        | 10-12 (sub40: 18)              | beginner 3-4 trčanja/ned; 1 kvalitet                               |
| 5K planovi (trainingzones, coachleo, trainingplan.dev)                          | 8 ned             | 20-24 → 25-35                        | 8-10 (max 14)                  | 3-4 trčanja/ned; long ~28% nedelje                                 |

## 2. Dijagnoza sadašnjeg modela

Reference: `packages/shared/src/plan-generator.ts` — `BAND_VOLUME` (17-22), `longKm = clamp(km*0.32, 5, longCap)` (317), `longCap` 28/32 (425, 472), `first` cap 55 (390).

Mereno probom generatora (18 ned, anchor, daysPerWeek=4, first, race 42,195):

| Slučaj                   | Start km/ned | Peak km/ned | Peak long | Long share |
| ------------------------ | ------------ | ----------- | --------- | ---------- |
| lt20 + M + first         | 14,9         | 40,1        | 12,8      | 32%        |
| 20-40 + M                | 27,9         | 60,1        | 19,2      | 32%        |
| 40-60 + M (d5)           | 38,2         | 78,1        | 25,0      | 32%        |
| lt20 + HM (identično M!) | 14,9         | 40,1        | 12,8      | 32%        |
| lt20 + 5K (identično M!) | 14,9         | 40,1        | 12,8      | 32%        |
| lt20, bez anchora (baza) | 14,9         | 40,1        | 12,8      | 32%        |

Nalazi:

1. **Long 2,5× prekratak**: Higdon N1 long = 32,2 km; naš lt20 M = 12,8. Cap 32 se fizički dostiže tek u gt60 (0,32×95=30,4).
2. **Distanca trke se ignoriše**: lt20 5K = lt20 HM = lt20 M. 5K dobija 40 km/ned (previše), M 12,8 km long (premalo).
3. **`first` cap 55 ne pomaže**: za lt20 je irelevantan (peak 40); problem je 32% formula + start 15, ne cap.
4. **Baza (bez anchora)**: `longCap` 28 se nikad ne aktivira (0,32×40=12,8); traženo je do 16-18.
5. **Long start lt20 = 5 km** (floor iz 0,32×15=4,8); Higdon N1 kreće od 9,7.
6. Ostatak mehanike je dobar: rast ≤ max(daysPerWeek,10), cutback −25% svake 4. ned, taping 3 ned.

## 3. Rekalibrisani model (long-run-first)

### Princip

Dugi trk je primarna serija: `longStart → +Δ po rastućoj nedelji → peak u `wPeak = weeks−4`` (~3 ned pre trke). Nedeljni volumen je izveden: `W(w) = L(w) / share(w)`, uz share krivu po distanci i bandu. Cutback i taping se primenjuju na obe serije.

### Band tabela (start km/ned → peak km/ned; peak long km; ≈ referenca)

| Band  | M                                         | HM                                                  | 10K                                                              | 5K                                                            |
| ----- | ----------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| lt20  | 20 → 55; 30 ≈ Higdon N1 (24→64/32)        | 15 → 36; 18 ≈ Higdon HM N2 (21→34/19)               | 15 → 30; 11 ≈ alastair beginner (18/8), trainingplan.dev (40/12) | 12 → 24; 8 ≈ trainingplan.dev (26-29/8), trainingzones (30/9) |
| 20-40 | 28 → 62; 32 ≈ Higdon N2 (31→58/32), Runna | 25 → 48; 19 ≈ flipmp (34/19), sportcoaching (45/18) | 25 → 40; 12 ≈ trainingplan.dev (32-48/12)                        | 20 → 32; 10 ≈ coachleo (25-35/10)                             |
| 40-60 | 42 → 82; 32 ≈ Pfitz 18/55 (53→88,5/32-35) | 38 → 60; 21 ≈ trainingzones int. (53/18)            | 36 → 52; 15 ≈ stridematch (36-45/12-14)                          | 30 → 48; 14 ≈ advanced 5K (48 km), cap 14                     |
| gt60  | 60 → 100; 34 ≈ Pfitz 18/70+, NRC (32-35)  | 50 → 72; 21 ≈ sportcoaching int. (55-60/18-19)      | 48 → 65; 18 ≈ run-r sub40 (65/18)                                | 42 → 55; 14 ≈ trainingzones cap 14                            |

Share na vrhu (long/peak): M = 0,55 / 0,52 / 0,39 / 0,34; HM = 0,50 / 0,40 / 0,35 / 0,29; 10K = 0,37 / 0,30 / 0,29 / 0,28; 5K = 0,33 / 0,31 / 0,29 / 0,26 (redom lt20→gt60). `shareStart = sharePeak − 0,08` (Higdon: start 40-42% vs vrh 50-55%).

### Formule

1. `prog(w)` = broj rastućih nedelja do `w`; cutback nedelje (`w % 4 === 3`) se preskaču.
2. `L(w) = min(longStart + ΔL·prog(w), longPeak)`; `ΔL = (longPeak − longStart) / prog(wPeak)`; posle `wPeak` drži `longPeak` do tapinga.
3. Cutback (`w % 4 === 3`, samo u netaper delu): `L ← 0,75·L`, `W ← 0,75·W` (kao danas u `rampWeeks`, 0,75).
4. `share(w) = shareStart + (sharePeak − shareStart)·min(prog(w), prog(wPeak)) / prog(wPeak)`.
5. `W(w) = min(L(w)/share(w), bandPeak, Wprethodna + max(daysPerWeek, 10))`; posle cutback-a se meri prema poslednjoj ne-cutback vrednosti (zadržati postojeće `lastGrowthValue` ponašanje).
6. Taping (poslednje 3 ned): `W ← peakW·[0,80, 0,60, 0,40]`; dugi trk: poslednji u `wPeak`, u tapingu `L ← longPeak·[0,70, 0,50]`, race nedelja bez long-a.
7. Podovi: long ≥ 5 km, easy ≥ 2 km; kvalitet/tempo/intervali ostaju kao danas (`qualityForWeek`, `buildQuality`).
8. `first`: `peakW = min(peakW, 60)`, `longPeak = min(longPeak, 30)` za M; kraće distance su već konzervativne.
9. Baza (anchor `null` ili `weeks < 12`): bez kvaliteta; `longPeak = min(18, longPeak tabele)` (M/HM 16-18, 10K 12, 5K 10); W iz formule 5; isti cutback/taping.
10. Kratki planovi: ako `prog(wPeak)` ne dozvoljava `ΔL` uz `maxStep`, peak se spušta (nema preskoka), ne diže tempo rasta.

## 4. Regresija / test očekivanja

- lt20 + M + first (18 ned, d4): `peakLong ≥ 28` (očekivano 30), `peakWeek ≥ 50` (očekivano ~55).
- 20-40 + M (d4): `peakLong ≥ 30` (32), `peakWeek ≥ 55` (62); 40-60: `peakLong = 32`, `peakWeek ≈ 82`; gt60: `peakLong = 34`, `peakWeek ≈ 100`.
- Distance se razlikuju: lt20 5K `peakWeek ≤ 26` i `peakLong ≤ 9`; lt20 M `peakWeek ≥ 50`.
- Peak long se javlja u nedelji `weeks − 4`; nijedan `LONG` posle nje; race nedelja bez `LONG`.
- Rast `W` između nesusednih cutback nedelja ≤ `max(daysPerWeek, 10) + 0,5` (tolerancija postojećeg testa); cutback nedelje (3, 7, 11, ...) pad 20-30%.
- Taping: `W` poslednje 3 ned u [0,75-0,85; 0,55-0,65; 0,35-0,45]·peakW; finalna < 50% peak (postojeći testovi iz `plan-generator.test.ts` ostaju zeleni sa 0,80/0,60/0,40).
- Long share na vrhu: M/HM lt20 i 20-40 u [0,45, 0,58]; 40-60/gt60 u [0,25, 0,42]; nikad > 0,58.
- Baza bez anchora: `16 ≤ peakLong ≤ 18` za M/HM; bez kvaliteta; trka poslednji dan.

## 5. Rizici

- **3 dana/ned + long-first**: share može preći 60%; mitigacija share cap (M 0,55) + `first` cap 30 km; ako nije dostižno, spušta se peak long, ne diže share.
- **Vremenski cap za spore trkače**: 30 km može biti > 3 h (Daniels ≤ 2,5-3 h); `first` cap 30 i cutback; opcija buduće zamene distanci vremenom van ovog obima.
- **Postojeći planovi u bazi se ne regenerišu**; novi model menja samo buduće planove — odluka o regeneraciji je van generatora.
- **Pfitz redovi (40-60/gt60) pretpostavljaju bazu i godine trčanja**; band ne znači spremnost — `first` cap je jedina zaštita, ne band.
- **Kratki planovi (<12 ned)**: ΔL i ΔW moraju da skaliraju uz `maxStep`; peak može ostati ispod tabele (prihvatljivo, bez skoka).
- **Cutback × taping preklapanje**: cutback samo u netaper delu (kao danas `nonTaper`) da ne nastane dvostruki pad.
- **Evidencija share-a u testovima** može biti krhka ako se tabele menjaju; testirati odnose (≤, ≥) umesto tačnih decimala.
