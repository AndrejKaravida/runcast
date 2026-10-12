# F6 — Istraživanje: Strategija za dan trke

## Metod

11 web upita: Runna race day / race week / audio cues / pacing guides (support.runna.com), Runna blogovi
(HM, 10K, brda, 25-min 5K), naučni radovi (PLOS One 2026, Frontiers 2025/2026, JSA, Ristanović 2023),
split kalkulatori (McMillan, sport-calculator, pacesplit), checklist izvori (GSSI, Marathon Handbook,
Running Channel, RunDida) i vreme (marathonpacekm, run247, atyourpace). Cilj: sadržaj za pacing karticu,
checklistu, vremenski note i final-week tips — bez novih zavisnosti.

## Šta Runna radi na dan trke

- Race workout se pojavljuje u planu na dan trke; daje ciljni pace range (ne split-po-split, jer je svaka
  staza drugačija) + audio km-splits i pace alerts („ubrzaj/uspori").
- Pace alerts aktivni samo na ravnim/kotrljajućim stazama; na brdovitim samo splits — gradijent je nepredvidiv.
- „RaceDay Pacing Guides" po distanci u aplikaciji (km-po-km breakdown) za one koji žele detaljnije.
- Savet: prvih nekoliko km 5–10 s/km sporije; M/HM even ili negative split; 5K/10K kontrolisano jako od
  starta, ali ne sprint.
- Race week: taper + „taper intervals" za šarp, testirana oprema/doručak, logistika do starta, šejkaut dan pre.
- Mentalno: chunking po km, if/then plan („ako padnem, fokus na formu"), sidra (disanje, kadenca).
- Checklist: veče pre (oprema, broj prikvačen, budilnik, logistika) + jutro (doručak 2,5–3 h pre, WC, zagrevanje).
- Ishrana: carb load 8–12 g/kg 1–3 dana; doručak 1–4 g/kg 2–4 h pre; M/HM gelovi tokom trke; 5K/10K bez gelova.

## Teorija tempa (šta je stvarno najbrže)

- Even split je najčešće najbrži: PLOS One 2026 (Boston, 78.912 finišera) — even 47,9% i najbrži prosek;
  jaki pozitivni split +60 min; pravi negativni split redak (~0,4%).
- Negative split ima fiziološko opravdanje (Frontiers 2025): štedi glikogen, bolja termoregulacija, manji
  kardio drift; elita često even/slight negative (Hanley 2015). Uslov: disciplinovan start.
- Pozitivan split je greška br. 1 rekreativaca: prva 5 km prebrzo, druga polovina i do 15% sporija (JSA).
- Praktično po distanci:
  - M: prva polovina kontrolisano (nikad brže od ciljnog tempa), sredina do 36 km +max 5 s/km ako je lako,
    zadnjih 6 km push.
  - HM: podela 3×7 km; prvih 5 km 3–5 s/km sporije, od 3. km ciljni tempo, zadnjih 5 km push.
  - 10K: 3/4/3 km; prva 3 km ~5 s/km sporije, pa ciljni tempo, zadnji km sve.
  - 5K: skoro even; mali kontrolisan brz start 3–6% brže od proseka (Gosztyla 2006) samo za iskusne —
    sprint sa starta je najgora opcija; zadnji km sve.
- Brda: trči po naporu, ne po satu; uzbrdo 30–90 s/km sporije, nizbrdo kratak korak bez sprinta (Runna blog).
- Tabele: standard su 5 km segmenti (McMillan i drugi kalkulatori); kumulativ = tempo × prediđeni km.
  Primeri: 3:45 M → 5:20/km, 5 km ~26:39, polovina 1:52:30; 50:00 10K → 5:00/km; 25:00 5K → 5:00/km po km.
- Tempo dati kao raspon (±3–4 s/km) jer sekunda-u-sekund nije izvodljivo (Runna 10K vodič).

## Checklist — šta uključiti

- Oprema: probane patike/čarape/šorc, broj prikvačen noć pre, sat/telefon puni, anti-chafe, kapica/krema.
- Ishrana: gelovi/elektroliti (M/HM), proban doručak 2–3 h pre, 200–300 ml vode u zadnjem satu, ništa novo.
- Logistika: dva alarma, ruta/prevoz, WC 30–45 min pre, slojevi za odbacivanje, drop-bag posle cilja.
- Na stazi: prvi km disciplinovan (proveri sat i aktivno uspori), gel svakih 30–35 min (M), voda na stanicama.

## Vreme (naš kod već ima pravila)

- `assessWorkoutWeather` za `RACE` nikad ne predlaže swap; severity warn za kišu/heat/cold/air (weather-rules.ts).
- Heat: konzervativan start, po naporu; kiša: anti-chafe + kapica + čarape; vetar: u glavu po naporu, ne juri
  sat; hladno: slojevi; cilj prilagoditi 5%+ u teškim uslovima (marathonpacekm, atyourpace).
- Prognoza (Open-Meteo) pokriva 7 dana → vremenski note ima smisla samo u trkačkoj nedelji.

## Šta kopiramo

- Ciljni tempo + buffer (±3–4 s/km), tabela po segmentima, first-km nota po distanci, even/negative toggle,
  checklist u 3 grupe (veče pre / jutro / staza), final-week tips, vremenski note sa trkačkim savetom.

## Šta ne kopiramo

- Audio cues/GPS i Garmin sync; split-po-split za brdovite staze (nemamo profil staze); auto-prilagođavanje
  ciljnog vremena po vremenu; notifikacije.

## Izvori

- support.runna.com: top-tips-for-race-day, setting-up-and-managing-your-audio-cues, mental-strategies-for-your-race-day,
  your-ultimate-marathon-race-day-guide, top-tips-for-race-week (+nutrition), how-to-pace-a-marathon, how-to-pace-a-10k
- runna.com: pacing-a-half-marathon, pacing-a-10k, how-to-adjust-your-race-pace-for-a-hilly-course, pace-guides/25-minute-5k
- PLOS One 2026 (pacing patterns, Boston 2015–2017); Frontiers 2025 (negative splits); Frontiers 2026 (developing
  negative split); JSA (fast starters, slow finishers); Ristanović 2023; Gosztyla 2006 (preko PIRX)
- mcmillanrunning.com pace charts; sport-calculator.com HM pacing; pacesplit.com 10K
- GSSI marathon race-day toolkit; marathonhandbook.com checklist; therunningchannel.com kit list; rundida.com race-day prep
- marathonpacekm.com conditions adjuster; run247.com changing weather; atyourpace.run bad-weather race tips
