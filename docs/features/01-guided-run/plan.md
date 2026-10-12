# F1 — Vođeno trčanje: plan (UX, audio skripta, prihvatanje)

Referenca ponašanja: Runna outdoor cues (vidi research.md). Srpski UI i srpski govor. Bez novih zavisnosti.

## 1. State machine

`idle → countdown → running ⇄ paused → finishing → finished → (log modal) → done`

- **idle**: pregled koraka, ukupno trajanje/distanca, mute toggle, opcija „Uključi GPS" (samo ako
  `navigator.geolocation` postoji), primarno dugme „Počni vođeno trčanje".
- **countdown**: 3-2-1 vizuelno + beep na svaku sekundu; bez verbalnog odbrojavanja (Runna paritet);
  na „1" govor „Krećemo!" i prelaz u running.
- **running**: aktivna deonica (label, preostalo vreme deonice), ukupno proteklo vreme, progress ring,
  sledeći korak, cue banner.
- **paused**: ručna pauza; sat zamrznut; „Pauza." / „Nastavljamo." govor.
- **finishing**: „Trening završen" + aktivno vreme + distanca (planirana ili GPS procena).
- **finished**: summary + „Zabeleži trening" (LogWorkoutModal) + „Zatvori bez logovanja".
- **Nedostupno**: REST/STRENGTH ili nema koraka → EmptyState sa linkom na `/workout/:id` (bez timeline-a).

## 2. Ponašanje po koraku

- Timeline je jedini izvor istine: `buildStepTimeline(workout, paces)`; UI ništa ne preračunava samo.
- Ulazak u segment: beep (880 Hz, 150 ms) + govor „Sledi: {label}." + „Tempo {m:ss} po kilometru."
  (ako segment ima `paceLabel` / izračunat tempo).
- Ponavljanja (identični uzastopni labeli, npr. 4× „1000 m @ I"): „Ponavljanje {i} od {n}."
- Granica segmenta: kratak beep (660 Hz) + „Korak završen."; poslednja 3 s: 3 tiha beepa, bez govora.
- Polovina ukupnog trajanja (jednom): „Polovina treninga."
- Pauza/nastavak: govor „Pauza." / „Nastavljamo."; sat staje/nastavlja.
- „Dalje" (rano završavanje deonice, kao Runna advance): „Prelazimo na: {label}."; „Nazad": bez govora.
- Kraj: „Trening završen. Vreme: {h:mm:ss}."
- **Nema live pace alerts u v1** — GPS nije izvor istine; ciljni tempo se izgovara na početku segmenta.

## 3. Audio skripta (srpski, svi stringovi u `cueTextFor` u shared)

| Trenutak                    | Tekst                               |
| --------------------------- | ----------------------------------- |
| Start (posle 3-2-1)         | „Krećemo!"                          |
| Uvod u segment              | „Sledi: {label}."                   |
| Tempo segmenta              | „Tempo {m:ss} po kilometru."        |
| Ponavljanje                 | „Ponavljanje {i} od {n}."           |
| Kraj segmenta               | „Korak završen."                    |
| Polovina                    | „Polovina treninga."                |
| Pauza / nastavak            | „Pauza." / „Nastavljamo."           |
| Preskočen korak             | „Prelazimo na: {label}."            |
| Kraj                        | „Trening završen. Vreme {h:mm:ss}." |
| GPS na kraju (ako uključen) | „GPS distanca: {km} kilometara."    |

Mute isključuje **sve** audio (govor i beepove); vizuelni cue banner ostaje uvek (paritet).

## 4. Kontrole

- Primarno dugme: „Počni vođeno trčanje" → „Pauza" → „Nastavi".
- „Dalje" / „Nazad": skok na sledeći/prethodni segment (menjaju `elapsed`).
- „Završi": ConfirmDialog „Završiti pre kraja?" → finishing sa stvarnim vremenom.
- Mute toggle (`aria-pressed`, ikonica + tekst), GPS toggle u idle.
- Sve kontrole ≥44 px, postojeći `AppButton` / `IconButton`, `useTapProps`.

## 5. Auto-log na kraju

1. `elapsedSec` = aktivno vreme (pauze isključene; monoton sat × `timeScale`).
2. Distanca: `workout.distance_km`; ako je GPS uključen i dao > 0 → GPS procena (2 decimale), uz oznaku „GPS".
3. „Zabeleži trening" otvara postojeći `LogWorkoutModal`; distanca i trajanje (`mm:ss`) **prefilovani**,
   RPE default 5; korisnik može sve da izmeni; čuvanje ide kroz postojeći `useLogWorkout` (markira DONE).
4. „Zatvori bez logovanja": workout ostaje PLANNED (nema automatskog DONE bez potvrde).
5. **Blokada**: `LogWorkoutModal` nije u F1 listi dozvoljenih fajlova, a prefill traži opcione propse —
   vidi otvorena pitanja. Fallback bez izmene: modal se otvara kao danas (distanca prefilovana iz workouta,
   trajanje korisnik ukuca).

## 6. Pristupačnost

- Vizuelni parnjak svakog audio cue-a: `CueBanner` sa tekstom, `aria-live="polite"` (jedini live region).
- Protekle vreme/label: `role="timer"`, bez live region-a (da ne spamuјu čitač).
- Mute toggle: `aria-pressed`, label „Zvuk uključen/isključen"; ikonica nikad nije jedini nosilac značenja.
- Reduced motion: `useReducedMotion` gasi pulsiranje/scale; beep/govor **nete dirati**. ProgressRing
  tranzicija je dekorativna (nije pokret izazvan interakcijom) — po potrebi `motion-reduce:` klasa.
- Kontrast i focus-visible po postojećim standardima; srpski labeli svuda.

## 7. Acceptance criteria

1. `/run/:id` radi pod auth + onboarding; na 320 px nema horizontalnog overflow-a.
2. Today i WorkoutPage: dugme „Vođeno" samo za PLANNED run tipove (`isRunWorkout`); REST/STRENGTH bez
   dugmeta; direktan URL za njih daje EmptyState.
3. Timeline: `durationSec` se koristi verbatim; korak sa `distanceKm` dobija `km × pace`; kad tempo nije
   poznat koristi se fallback i UI pokazuje „procena tempa".
4. Sat je tačan posle `visibilitychange` (throttling) i pauza ga zamrzava; `?timeScale=30` ubrzava 30×.
5. Svaki cue postoji i audio (kad je dostupno) i vizuelno; mute gasi zvuk, banner ostaje.
6. Kraj: „Trening završen" + aktivno vreme; „Zabeleži trening" vodi u postojeći log tok; postojeći E2E
   (`app.spec.ts`, `responsive.spec.ts`) i shared testovi ostaju zeleni.
7. Wake lock se traži pri startu i ponovo na povratku u vidljivost; neuspeh ne blokira trening.
8. Bez novih npm zavisnosti; `guided.test.ts` pokriva timeline i cue tekstove.

## 8. Otvorena pitanja (za vlasnika kontrakta)

1. **LogWorkoutModal prefill**: dozvoliti malu izmenu (opcioni `initialDistanceKm?`/`initialDurationSec?`)
   iako fajl nije u F1 listi? Predlog: da — inače korisnik ponovo kuca trajanje.
2. **Pace alerts**: potvrda da v1 nema live GPS pace alerts (samo ciljni tempo po segmentu).
3. **SR TTS glas**: ako `sr` glas ne postoji — samo beep + vizuelno (predlog) ili govor na default glasu?
4. **Već DONE workout**: predlog — vođenje dozvoljeno, log CTA skriven ako `run_log` već postoji.
5. **`?timeScale` u produkciji**: ostaviti aktivno (bezopasno, korisno za demo) — potvrda.
