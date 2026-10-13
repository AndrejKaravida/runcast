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

Preduslov: **Xcode** (App Store, ~10 GB) i besplatan Apple ID. Potpis traje 7 dana, pa se
ponavlja build nedeljno. Detaljno uputstvo je u odgovoru nakon prve native faze; kratko:

1. Instaliraj Xcode → `sudo xcode-select -s /Applications/Xcode.app`
2. `npm run build -w app && npx cap sync ios` (u `app/`)
3. Otvori `app/ios/App/App.xcodeproj`
4. Signing & Capabilities → Team: izaberi svoj (Personal Team) → promeni Bundle Identifier ako
   Xcode traži jedinstven
5. Poveži iPhone kablom → izaberi ga kao target → Run
6. Na telefonu: Settings → General → VPN & Device Management → verifikuj svoj developer profil

Za trajnu instalaciju (bez 7-dnevnog ciklusa) treba Apple Developer Program ($99/god) ili
distribucija preko TestFlight-a; PWA ostaje kao potpuno funkcionalna alternativa bez ikakvih
troškova.

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
- Health integracije (Apple Health, Health Connect, Xiaomi preko Mi Fitness) su planirane u
  `docs/features/12-health/` i dodaju se kao Capacitor plugin u sledećoj fazi
