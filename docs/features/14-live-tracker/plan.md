# F14 — Live tracker: GPS trčanje sa progresom do cilja

Cilj: na `/run/:id` (Vođena) korisnik klikne Start i vidi **živi progres ka planiranoj
distancu** (npr. „2.4 / 6 km"), live pace, splite po km, uz haptičke/audio cue-ove. Bez
novih teških zavisnosti; web Geolocation + Wake Lock API rade u Capacitor WebView-u.

## Trenutno stanje (recon)

- `useGeoDistance.ts` već prati GPS (`watchPosition`, haversine, ≤50 m accuracy, ≥5 m korak),
  ali je toggle isključen po defaultu i prikazuje samo distancu.
- `useGuidedRunner.ts`: clock + segment timeline (`shared/guided.ts`), speech cue-ovi, wake
  lock, fueling za LONG. Finish ne piše log: `GuidedFinish` otvara `LogWorkoutModal` prefill.
- Nema live pace, splita, progres bara, auto-pause. Native permissioni za lokaciju ne postoje
  (AndroidManifest nema lokaciju; Info.plist nema NSLocation*).

## Implementacija

1. **Tracking** (`useGeoDistance` proširiti ili novi `useLiveTrack`):
   - filter: odbaci fix accuracy > 50 m ili star > 5 s; korak prihvati ako implicirana brzina
     ≤ 12 m/s i korak ≥ accuracy/2 (drift u mestu).
   - stanje: `distanceM`, `splits[]` (km splits), `paceEma` (EMA 15–20 s), `gpsLost`.
   - auto-pause: brzina < 0.6 m/s 5 s → pauza; ≥ 3 m kretanja + brzina iznad praga → resume;
     nikad ne broji drift između pauze i resume. Manualna pauza primarna.
2. **UI (GuidedRunPage)**: veliki km (2 decimale) + progres bar ka planiranoj distanci
   (`workouts` ima planiranu distancu), elapsed, live pace, avg pace, lista splita. GPS izgubljen
   → „distanca pauzirana" baner, tajmer ide dalje, auto-resume. Bez mape u v1 (baterija + dep).
3. **Cue-ovi**: na svaki km haptic (Capacitor Haptics) + kratak beep; SpeechSynthesis (sr/en,
   postojeći mehanizam) za split/halfway/done. Ako nema glasa → samo beep.
4. **Wake lock**: već postoji; re-request na `visibilitychange`; iOS < 16.4 → upozorenje
   „drži aplikaciju otvorenom". Foreground-only u v1 (iOS suspeduje watchPosition u pozadini).
5. **Fallback**: permission denied ili GPS nedostupan → ručni unos distance/trajanja (isti
   `LogWorkoutModal` tok) da rang lista/feed nastave da rade.
6. **Finish**: prefill loga pravom izmerenom distancom/pace-om (postojeći modal tok ostaje);
   `source: 'gps' | 'manual'` u log (migracija: `run_logs.source text default 'manual'`).
7. **Native**: AndroidManifest `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION`; Info.plist
   `NSLocationWhenInUseUsageDescription` (+ `NSLocationAlwaysAndWhenInUseUsageDescription`).
   Bez `@capacitor/geolocation` u v1 (navigator.geolocation radi u WebView-u; plugin tek uz
   background fazu).
8. **E2E**: mock `navigator.geolocation.watchPosition` (addInitScript) sa sintetičkim nizom
   pozicija → assert rast distance, progres bara, splita na 1 km; deny scenario → ručni unos.

## Van v1

Mapa/ruta, background tracking (`@capacitor-community/background-geolocation`), auto-pause
preko akcelerometra (GPS pausing izobliči pace), snimanje tempa po sekundi u DB.
