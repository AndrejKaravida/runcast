# Native aplikacija (Capacitor)

RunCast je jedna codebase koja izlazi na tri mesta:

| Cilj    | Kako se pravi                                     | Status                          |
| ------- | ------------------------------------------------- | ------------------------------- |
| Web     | `npm run build` → Cloudflare Pages (auto na push) | ✅ live                         |
| PWA     | ista web verzija, „Add to Home Screen"            | ✅ live                         |
| Android | Capacitor shell + Gradle → APK                    | ✅ build radi lokalno i u CI-ju |
| iOS     | Capacitor shell + Xcode                           | ⏳ traži Xcode na Mac-u         |

Capacitor umotava **isti web build** u native shell: bez prepisivanja ekrana, uz pristup native
API-jima (status bar, splash, HealthKit/Health Connect u sledećoj fazi).

## Android: build i instalacija na telefon

```bash
npm run apk:debug -w app
```

APK se pojavi na: `app/android/app/build/outputs/apk/debug/app-debug.apk`

Instalacija bez prodavnice:

1. Prebaci APK na telefon (AirDrop, USB, Google Drive…)
2. Otvori ga na telefonu → Android traži dozvolu „Install unknown apps" za aplikaciju iz koje
   otvaraš fajl → dozvoli
3. Instaliraj → RunCast se pojavi kao prava aplikacija (bez browsera)

Alternativa bez lokalnog build-a: push na `main` pokreće **Android APK** GitHub workflow; APK
skini iz Actions → artifacts (`runcast-debug-apk`). Workflow koristi `SUPABASE_ANON_KEY` secret
koji je već podešen.

## iOS: build i instalacija (besplatno, bez Apple Developer naloga)

**Xcode 27 je instaliran** i iOS projekat je verifikovan build-om za simulator (Xcode 27, iOS 26.5
runtime). Ako `xcodebuild` prijavi da je aktivna CommandLineTools, koristi `DEVELOPER_DIR` override
(bez sudo):

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  xcodebuild -project app/ios/App/App.xcodeproj -scheme App \
  -sdk iphonesimulator -configuration Debug -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

Za pokretanje na pravom telefonu (besplatan Apple ID, potpis traje 7 dana):

1. `npm run build -w app && npx cap sync ios` (u `app/`)
2. Otvori `app/ios/App/App.xcodeproj` u Xcode-u
3. Signing & Capabilities → Team: izaberi svoj (Personal Team) → promeni Bundle Identifier ako
   Xcode traži jedinstven
4. Poveži iPhone kablom → izaberi ga kao target → Run
5. Na telefonu: Settings → General → VPN & Device Management → verifikuj svoj developer profil

Za trajnu instalaciju (bez 7-dnevnog ciklusa) treba Apple Developer Program ($99/god) ili
distribucija preko TestFlight-a; PWA ostaje kao potpuno funkcionalna alternativa bez ikakvih
troškova.

## Zdravstvene integracije (Apple Health, Health Connect)

- **iOS**: u Xcode-u otvori `app/ios/App/App.xcodeproj`, izaberi target App → Signing & Capabilities →
  „+ Capability" → **HealthKit** (jedan checkbox). Fajl `app/ios/App/App/App.entitlements` je već u
  repou i Xcode ga poveže klikom; `Info.plist` već sadrži `NSHealthShare` i `NSHealthUpdate` opise.
- **Android**: `AndroidManifest.xml` deklariše `READ_EXERCISE` i `READ_HEALTH_DATA_HISTORY`.
  Health Connect je u sistemu na Androidu 14+, a na starijim verzijama korisnik instalira
  „Health Connect by Android" sa Play prodavnice; aplikacija ga sama uputi tamo.
- **Play Console (pre objave)**: popuniti Data safety i Health apps declaration za čitanje vežbanja;
  privacy policy URL mora biti javno dostupan i naveden u Play Console i u aplikaciji.
- Uvoz traži pristanak korisnika u Health/Health Connect; RunCast čita samo trčanja (datum, distanca,
  trajanje) i ne piše u zdravstveni store u v1.

## Struktura

- `app/capacitor.config.ts` — appId `app.runcast.mobile`, splash i status bar konfiguracija
- `app/android/` — native Android projekat (Gradle), commitovan; build artefakti su ignorisani
- `app/ios/` — native iOS projekat (SPM, bez CocoaPods), commitovan
- `app/src/lib/native.ts` — detekcija native platforme, status bar po temi, hide splash posle
  prvog rendera; web build je potpuno neizmenjen kada se otvara u browseru
- `app/resources/` — izvorne splash slike za native tooling

## Napomene

- Posle svake promene web koda: `npx cap sync` (radi se automatski u `apk:debug` i CI-ju)
- `local.properties` (putanja do Android SDK) je lokalna i nije u repou
- Health integracije (Apple Health, Health Connect, Xiaomi preko Mi Fitness) rade preko
  `@capgo/capacitor-health`; statusi i uvoz su u podešavanjima, sekcija „Integracije"
