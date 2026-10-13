# F12/R2 — Plan: Settings „Integracije" i uvoz trčanja

## Cilj (v1)

Uvoz odrađenih trčanja iz Apple Health (iOS) i Health Connect (Android) u `run_logs`, sa
povezivanjem na planirani workout kada je jednoznačno. Xiaomi (Mi Band/Watch) dolazi indirektno —
preko Mi Fitness/Zepp sync-a u Apple Health / Health Connect (vidi istraživanje). Sve bez pozadinskog
rada: sync na zahtev i (opciono) jednom pri otvaranju aplikacije.

## Settings → nova sekcija „Integracije"

- Nova `AppCard` u `SettingsPage.tsx` (posle sekcije Trening), naslov `Integracije`; sav tekst kroz
  `settings.json` ključeve (`integrations.*`), sr/en.
- **Web/PWA**: jedan red sa porukom „Dostupno u mobilnoj aplikaciji" + kratko objašnjenje; bez
  dugmadi i bez greške (`Capacitor.getPlatform() === 'web'`).
- **iOS — red „Apple Health"**: status `AppBadge` (Nije povezano / Povezano / Nedostupno); primarno
  dugme „Poveži" (otvara HealthKit permission sheet), posle grant-a „Uvezi trčanja".
- **Android — red „Health Connect"**: isti pattern; ako HC nije dostupan (Android 9–13 bez APK-a):
  tekst „Potrebna je aplikacija Health Connect" + dugme koje otvara Play/Health Connect;
  na Android 14+ sve radi bez instalacije.
- **Zajednički blok**: toggle „Automatski uvoz" (default OFF) + red „Poslednji uvoz: 12.10. 08:15 —
  uvezeno 3, preskočeno 1" ili „Još nema uvoza"; stanje u `localStorage` (`runcast.health.autosync`,
  `runcast.health.lastSync`) po uzoru na `runcast.fueling`.
- **Xiaomi uputstvo** (mali `text-caption`): iOS — „Mi Fitness → Profile → Third-party data → Health
  (uključi cloud sync)"; Android — „Mi Fitness/Zepp Life → Third-party data → Google Fit, pa Google
  Fit → Sync with Health Connect". Bez garancije kompletnosti.

## Ponašanje

- „Uvezi trčanja" → ako permissions nisu dati, prvo ih traži; zatim čita trčanja od poslednjeg
  uspešnog uvoza (prvi put: poslednjih 90 dana) i prikazuje rezultat: „Uvezeno N, preskočeno M,
  povezano sa K treninga" (toast/badge ispod reda).
- „Automatski uvoz" ON → pokušaj uvoza pri startu app-a i povratku u foreground (Capacitor `App`
  `resume`), samo ako je već povezano; tiho, uz ažuriranje „Poslednji uvoz"; greška ne prekida rad.
- Ako nema novih trčanja: „Nema novih trčanja od poslednjeg uvoza".
- Ako je pristup odbijen (iOS se ne može detektovati — prazan rezultat): poruka „Nema trčanja ili
  pristup nije dozvoljen — proveri u Health/Health Connect".
- Uvoz **nikad** ne menja postojeće `run_logs`; duplikati se preskaču; povezivanje menja samo
  `workouts.status` PLANNED → DONE (ne dira ostale statuse).

## Šta korisnik vidi po platformi

| Platforma | Red | Dugme | Posebno |
| Web/PWA | — | — | „Dostupno u mobilnoj aplikaciji" |
| iOS native | Apple Health | Poveži / Uvezi | ograničen istorijski prozor moguć |
| Android 14+ | Health Connect | Poveži / Uvezi | HC u sistemu; 30-dnevni cap bez history grant-a |
| Android 9–13 | Health Connect | Instaliraj → Poveži | HC APK sa Play-a je uslov |

## Kopije (sr, predlog — finalno u `settings.json`)

- Naslov: „Integracije"; podnaslov: „Uvezi svoja trčanja iz zdravstvenih aplikacija."
- Dugmad: „Poveži Apple Health", „Poveži Health Connect", „Uvezi trčanja", „Instaliraj Health Connect".
- Toggle: „Automatski uvoz" + hint „Uvozi nova trčanja kada otvoriš RunCast."
- Privacy hint: „Podaci ostaju na telefonu — RunCast upisuje samo trčanja: datum, distancu i trajanje."

## Van obima v1 (eksplicitno, ne radimo)

- Background sync: HKObserverQuery/`enableBackgroundDelivery` i HC `READ_HEALTH_DATA_IN_BACKGROUND`
  ne uvodimo u v1 (nema garancija isporuke, dodatni entitlementi i baterijski rizik).
- Direktni Xiaomi/Mi Fitness API — ne postoji javni; reverse-engineered varijante se ne koriste.
- Strava API — gated (pretplata, 10 athlete, review; F11) ostaje kako je odlučeno.
- GPX ručni uvoz — fallback ideja za kasnije, ne u v1 (istraživanje beleži pristup).
- Pisanje trčanja iz RunCast-a u Health store (write) — kasnija faza.
- HR/energija/splits: `run_logs` nema ta polja; ostajemo na datum/distanca/trajanje.

## Kriteriji prihvatanja

1. iOS/Android: uvoz daje tačan `log_date` (lokalna zona), distancu (km, 2 dec.) i trajanje.
2. Ponovni uvoz ne pravi duplikate (isti `externalId`) niti duplira ručno unete logove (dan ± tolerancija).
3. Tačno jedan PLANNED/DONE run workout tog dana → povezan i označen DONE; inače `workout_id` null.
4. Web prikazuje poruku i ne puca (stub adapter); postojeći E2E netaknuti.
5. Novi E2E (mock adapter) pokriva: web stub, uspešan uvoz, ponovni uvoz bez duplikata.
6. Lint/typecheck i postojeći spec-ovi prolaze.

## Redosled implementacije (detalji u arhitekturi)

1. Migracija `external_id` + unique index.
2. `packages/shared/src/health.ts` (pure: mapiranje, dedupe, matching) + testovi.
3. Adapter + `window.__runcastHealthMock` hook.
4. Mutacija uvoza + UI sekcija.
5. `app/e2e/health.spec.ts`; 6. native smoke (Android build; iOS čeka Xcode).
