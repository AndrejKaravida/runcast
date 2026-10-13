# F12/R1 — Istraživanje: Apple Health, Health Connect i Xiaomi za uvoz trčanja

## Metod

15 web upita (plugin ekosistem 2026, HealthKit background/App Review, Health Connect/Play politike,
Google Fit deprecation, Mi Fitness/Zepp sync lanci, Xiaomi API, duplikati/timezone, Strava API) +
čitanje README-a @capgo/capacitor-health, @capacitor/health-fitness i capawesome objave.
Cilj: izabrati plugin, utvrditi šta Xiaomi realno daje i pravila kvaliteta podataka.

## 1. HealthKit kroz Capacitor — izbor plugina (stanje 2026)

- **@capgo/capacitor-health** (v8 uz Capacitor 8, aktivan — objavljen pre par dana, besplatan):
  jedan API za HealthKit i Health Connect; `queryWorkouts()` radi na obe platforme i vraća
  `duration` (s), `totalDistance` (m), `startDate/endDate` (ISO), `sourceName/sourceId`,
  `platformId` (HK UUID / HC metadata ID), `metadata`, pagination preko `anchor`; `readAuthorized/
readDenied` po tipu; `requestHistoryAccess` za HC > 30 dana; `isAvailable()` sa razlogom.
- **@capacitor/health-fitness** (zvanični Capacitor, avg 2026): `getWorkoutData()` je **iOS-only**
  („the native Android library has no workout-specific query") → ne pokriva Android uvoz trčanja;
  JSON-string API bez tipova; `setBackgroundJob` (iOS) i HC privacy policy zahtevi.
- **@capawesome-team/capacitor-health**: najlepši API (`readWorkouts`, `aggregate` sa platform-side
  dedupe), ali **Insiders pretplata** (plaćeno) i Capacitor 8+.
- **@perfood/capacitor-healthkit**: v1.3.2 poslednja objava pre ~8 meseci, main branch zamrznut
  („PRs no longer accepted"), v2 alpha; iOS only → maintenance rizik.
- **Odluka: @capgo/capacitor-health** (jedini besplatan, aktivan, workout read na iOS i Android);
  API izolujemo u adapter (arhitektura) da zamena bude jedan fajl.

## 2. Permissions model i ograničenja

- iOS: HealthKit **nikad ne otkriva da li je read dozvoljen** — denied daje prazne rezultate;
  korisnik može dati „limited" prozor istorije; write traži `NSHealthUpdateUsageDescription` i
  capability `com.apple.developer.healthkit`.
- Android: `android.permission.health.READ_EXERCISE`; čitanje starije od ~30 dana traži
  `READ_HEALTH_DATA_HISTORY` (Android 14 ext. 13+/HC APK 171302+; stariji provajderi je tiho
  preskoče → uvoz samo 30 dana); `READ_HEALTH_DATA_IN_BACKGROUND` za pozadinu.
- Background delivery (zašto ne u v1): HKObserverQuery + `enableBackgroundDelivery` + entitlement
  `com.apple.developer.healthkit.background-delivery`; nema garantovanog minimuma/latency-ja;
  ~15 s budžet po wake-u; posle 3 nepotvrđene isporuke HealthKit prestaje da budi app; registracija
  mora u `didFinishLaunchingWithOptions`; Health Connect **nema callback za nove podatke** uopšte.
- Write: plugin ima `saveSample()`, ali v1 ne piše u store (moguća kasnija faza: zapis vođene trke).

## 3. App Review (iOS) i Play zahtevi (Android)

- iOS: obavezni `NSHealthShareUsageDescription` i `NSHealthUpdateUsageDescription` (bez njih app
  crashuje na zahtevu); privacy policy obavezna; App Review 5.1.3: HealthKit samo za health/fitness
  svrhe, zabranjeno korišćenje za oglašavanje/prodaju podataka, deljenje trećima uz pristanak.
- Android: Health Connect je na Android 14+ u sistemu, a na 26–33 korisnik instalira „Health Connect
  by Android" (APK) sa Play-a; Play Console traži **Data safety** i **Health apps declaration form**
  (opravdati svaki tip) + javno dostupnu privacy policy (URL u Play i u app-u).
- Google Fit API-ji se gase krajem 2026 (novi sign-up od 1.5.2024 ne postoji) → ne koristimo Fit,
  ni „stari Google Fit bridge"; direktno Health Connect.

## 4. Xiaomi (Mi Watch / Mi Band) — put ide preko OS store-a

- **Nema javnog Xiaomi/Mi Fitness API-ja.** Postoje reverse-engineered endpointi (api-mifit.huami.com,
  passToken) u community projektima — ToS rizik i krhko; ne koristimo.
- iOS: Mi Fitness → Profile → Third-party data → Health (+ cloud sync mora biti uključen) piše u
  Apple Health (zvanični Xiaomi FAQ); korisnici prijavljuju nepotpun sync (npr. steps bag) → uzimamo
  ono što stigne. Zepp Life piše steps/sleep/weight u Apple Health; Zepp app (Amazfit) može u
  Apple Health/Google Fit/Strava.
- Android: Mi Fitness „Third-party data" → Google Fit (uz cloud sync) → Google Fit „Sync with Health
  Connect" → Health Connect; Zepp Life isto preko Google Fit-a; HC nativno sadrži npr. `com.huami.*`
  origin zapise.
- Ograničenja: regionalne verzije app-a (CN vs global), sync obično počinje od trenutka povezivanja
  (stara istorija se ne prenosi), kompletnost zavisi od Xiaomi-ja → UI uputstvo, bez garancija.

## 5. Strava i GPX fallback

- Strava API (potvrđeno 2026, F11): Standard tier traži **Strava pretplatu** (~$11.99/m) na nalogu
  vlasnika app-a; default 1 athlete → self-service 10 → review do 9.999; club endpointi uklonjeni
  1.9.2026; novi base URL od 4.1.2027; pravilo 7-dnevne keš/deep-link. Ostaje van v1.
- Ručni GPX uvoz (fallback, kasnije): `trkpt` lat/lon/ele/time; distanca haversine; GPX vremena su
  UTC (`Z`) → `log_date` po lokalnoj zoni; mali parser bez nove zavisnosti.

## 6. Kvalitet podataka (duplikati, matching, timezone, jedinice)

- **Duplikati**: iPhone i Watch oba pišu steps (Health ih agregatno dedupira po prioritetu izvora),
  ali **HKWorkout zapisi se ne dedupiraju** — ista trka iz dva izvora ostaje dva zapisa. Health
  Connect vraća ExerciseSessionRecord iz svih origin paketa, bez automatske dedupe. Zato uvoz radi
  sopstveni dedupe (isti `externalId`, pa datum ± tolerancija).
- **Matching na trening**: po datumu i tipu — ako je tačno jedan PLANNED/DONE run workout tog dana,
  povezujemo; inače ostaje `workout_id = null` (bez pogađanja).
- **Timezone**: HK datumi su UTC instanti (zona u `HKMetadataKeyTimeZone`), HC ima `startZoneOffset`/
  `endZoneOffset`; `log_date` računamo u lokalnoj zoni uređaja u momentu trčanja (trka u 23:30 ostaje
  na svom danu; ne koristimo UTC datum).
- **Units**: plugin vraća metre → `distance_km` na 2 decimale (`run_logs.distance_km numeric(6,2)`);
  `duration_sec` su sekunde; `avg_pace = round(duration/distance)`; treadmill (0 m) → `distance_km`
  i `avg_pace` ostaju `null`, `duration_sec` se čuva.

## Izvori

docs @capgo/capacitor-health (GitHub README) · capacitorjs.com/docs/apis/health-fitness ·
capawesome.io (objava + docs) · npm @perfood/capacitor-healthkit · developer.apple.com (HealthKit:
authorizing access, protecting privacy, HKObserverQuery, HKMetadataKeyTimeZone, entitlements) ·
developer.android.com (Health Connect get-started, data types, ExerciseSessionRecord, publish,
Fit migration) · support.google.com (Health apps declaration) · mi.com FAQ (KA-230360, KA-517372,
KA-12890) · zepplife.net (third-party integrations) · amazfit support · developers.strava.com
(getting started, changelog, API agreement 2026) · theverge.com/techrepublic/sahha (Strava 2026).
