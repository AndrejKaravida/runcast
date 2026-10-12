# F1 — Vođeno trčanje: istraživanje (Runna + browser)

Datum: 2026-10-12. Obim: audio-vođeno trčanje u browseru (mobile web), bez novih zavisnosti.
Repozitorijumski kontekst: `WorkoutStep` ima `label`, `distanceKm?`, `durationSec?`, `pace?` (string
„m:ss"); `PlanPaces` živi na planu (`useActivePlan().paces`), workout red ne sadrži tempe.

## 1. Runna — ponašanje audio navođenja (glavna referenca)

Zvanična lista „outdoor audio cues" (Runna support):

- „Get ready to start" — vizuelni odbrojavač, **bez verbalnog odbrojavanja** do starta.
- „Start running" na početku; pause/resume najava.
- Pace alerts: „speed up" / „slow down" sa trenutnim tempom i ciljnim opsegom, samo na deonicama sa ciljem.
- Halfway informacija tačno na polovini treninga.
- „Lap x completed in x time" na svakoj granici deonice; run split posle svakog km/mi („Lap 1 completed in 5:50 min/km").
- „Workout completed in x time" na kraju.

Ključni detalji: tokom intervala/tempo deonica cue-ovi idu **samo na granicama** (nema naracije unutar repа);
cues postoje **samo za trčanje** — strength/cross-training ih ne dobija zato što „lap" ne postoji;
„Intervals/Tempo on Track" i „Open Warm-Up" isključuju automatsko napredovanje (korisnik ručno prelazi).
Watch app: dvostruki tap = rano završavanje deonice; „feedback distance" je fiksiran za plan sesije.
Korisnici prijavljuju dupliranje/kašnjenje cue-ova i trajno utišanu muziku (Reddit) — imperfekcija je norma.

NRC: koč-dirigovani guided runs sa distance markerima i dugim tišinama; poznat bug — coach „stane" kad app
odе u pozadinu, pa nadoknadi sve odjednom na povratku. Apple Fitness+ „Time to Run": trener govori između
pesama (ne kontinuirano), traži promenu/održavanje tempa; Audio Hints nisu podržani u Time to Run.

## 2. Browser API nalazi

**SpeechSynthesis.** iOS Safari zahteva da prvi `speak()` bude unutar user gesture-a (WebKit bug 223473);
posle prvog uspešnog govora programski `speak()` iz tajmera radi — trik: prazan utterance na start dugme.
`getVoices()` na Safari ume da vrati prazno; `voiceschanged` nije pouzdan/postoji; srpski (`sr-RS`) glas
često nije instaliran. Ako stranica ode u pozadinu usred govora, sinteza se prekida i ume ostati mrtva do
refresh-a. Nema greške/događaja kada je speak blokiran → neophodna sentinel provera.

**Web Audio (beep).** Autoplay policy: `AudioContext` kreiran pre gesta je `suspended`; `resume()` mora
sinhrono u gesture call-stack-u (Safari ne prihvata iz Promise-a). iOS bug 263627: posle background→foreground
context ume da ostane „running" a `currentTime` stoji; workaround je `suspend()`+`resume()` na `visibilitychange`.
Chrome izuzima od throttling-a stranice koje emituju zvuk (osnov i za silent-audio keep-alive trik).

**Screen Wake Lock.** Chrome 84+, Safari iOS 16.4+; zahteva secure context (imamo localhost/HTTPS). Lock se
automatski otpušta kad dokument postane hidden → re-request na `visibilitychange`. Home-screen web app na
iOS-u je istorijski imao bugove (WebKit 254545; popravljeno iOS 18.4, ima regresija) — ne oslanjamo se na PWA.

**Geolocation (opciono).** `watchPosition` radi samo dok je stranica vidljiva; na iOS-u se JS suspenduje kad
tab ode u pozadinu ili se ekran zaključa (nije throttling — stop). Web ne može „Always" dozvolu. Posle
unlock-a ume da vraća pozicije pogrešne po stotinama metara dok se watch ne restartuje. `enableHighAccuracy`
troši ~15–25% baterije/h → samo opcija, nikad izvor istine za tempo.

**Tajmeri i pozadina.** Chrome: hidden tab → wakeupi na ≥1 s; „intensive throttling" na 1/min posle 5 min
(hidden >5 min, chain ≥5, tiho ≥30 s, bez WebRTC); `requestAnimationFrame` se ne poziva u pozadini.
iOS Safari: pozadinski tab/ekran lock = JS u potpunosti suspendovan. Posledica: stanje se **mora** izvoditi
iz monotoničnog sata (`performance.now()` delta), nikad akumulacijom tikova; na `visibilitychange`
resinhronizacija uz preskakanje propuštenih cue-ova.

**Vibration.** `navigator.vibrate` nije podržan u Safari iOS (WebKit se formalno protivi) → tretirati kao no-op.

## 3. Šta nije moguće na webu (a native može)

- Kontinuirani audio cues sa zaključanim ekranom (native audio session; web se prekida).
- Background GPS snimanje rute, auto-pause detekcija, snimanje preko celog treninga.
- Pouzdana haptika na iOS-u; HR kaiši (nema Web Bluetooth u iOS Safari); watch integracija.
- „Always" lokacija i bilo kakav rad van vidljivog tab-a.

## 4. Rizici i mitigacije

| Rizik                                           | Mitigacija                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| Timer throttling / ekran lock                   | monotoni sat + resync na visibilitychange; wake lock + UI hint „drži ekran uključen" |
| iOS speech blokiran ili umre posle background-a | unlock praznim utterance-om na Start; feature-detect; vizuelni parnjak svakog cue-a  |
| Nema srpskog TTS glasa                          | ako `sr` glas ne postoji → beep + vizuelni cue (bez pogrešnog jezika)                |
| Nema pouzdanog tempa/distance                   | ciljni tempo po planu; GPS opciono i jasno označen kao procena, nikad za diktiranje  |
| E2E u headless-u nema zvuk                      | cue se uvek renderuje i tekstom (`aria-live`) i kao beep/govor                       |
| Muzika korisnika (utišana/keep-alive)           | ne koristimo silent-audio keep-alive hack; mute toggle u UI                          |

## 5. Izvori

- Runna audio cues: https://support.runna.com/en/articles/8159780-setting-up-and-managing-your-audio-cues
- Runna struktura treninga: https://support.runna.com/en/articles/15690947-understand-your-runna-workouts
- Runna pacing guidance: https://www.runna.com/marathon-training-app
- Runna feedback (cues): https://www.reddit.com/r/runna/comments/1ixu87w/feedback_on_runna_audio_cues/
- Runna laps/pace alerts opis: https://www.runningwestwardho.co.uk/post/the-problem-with-runna
- NRC guided runs: https://www.nike.com/nrc-app (glitch thread: https://www.reddit.com/r/nikerunclub/comments/1dddsmj)
- Apple Time to Run: https://support.apple.com/en-us/102128 + https://www.runnersworld.com/training/a38747313
- SpeechSynthesis iOS: https://bugs.webkit.org/show_bug.cgi?id=223473, https://stackoverflow.com/questions/67655133,
  https://weboutloud.io/bulletin/speech_synthesis_in_safari/
- Web Audio autoplay/iOS: https://developer.chrome.com/blog/autoplay, https://bugs.webkit.org/show_bug.cgi?id=263627
- Wake Lock: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API,
  https://caniuse.com/wake-lock, https://bugs.webkit.org/show_bug.cgi?id=254545
- Geolocation u pozadini: https://gpstrack.dev/blog/why-your-run-stops-recording-when-the-screen-locks,
  https://stackoverflow.com/questions/62763804
- Timer throttling: https://developer.chrome.com/blog/timer-throttling-in-chrome-88
- Vibration: https://caniuse.com/mdn-api_navigator_vibrate
