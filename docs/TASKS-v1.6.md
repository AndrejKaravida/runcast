# TASKS v1.6 — native shell (Capacitor), Health integracije, splash, globalni review

## Status tracker

- [x] A — Capacitor native shell u `app/` (android + ios scaffold, config, plugin core, GH Actions Android APK)
- [x] B — Splash screen (runner): web splash overlay + FullScreenLoader upgrade + native splash assets
- [x] C — Health istraživanje: HealthKit + Health Connect (pokriva Apple Watch i Xiaomi preko Mi Fitness), plugin izbor, import pravila
- [ ] D — Health implementacija: Settings „Integracije", import trčanja u run_logs (dedupe + match na plan), web fallback „nedostupno"
- [ ] R2a-e — Globalni review (5 agenata po oblasti) → docs/review2/*
- [ ] R2f — Konsolidacija + P0/P1 popravke
- [ ] Final — kapija + commit/push + CI/deploy verifikacija

## Odluke

- **Native**: Capacitor (ne Expo/RN) — zadržavamo 100% web koda; appId `app.runcast.mobile`; native
  folderi commitovani; Android debug APK build lokalno + GH Actions; iOS scaffold u repou, build
  traži Xcode (korisnikov korak, besplatno za lični telefon).
- **Health**: HealthKit (iOS) + Health Connect (Android) preko Capacitor plugina (izbor u C doc-u);
  Xiaomi Mi Band/Watch put: Mi Fitness → Apple Health (iOS) ili Health Connect (Android) → naš import.
  Import: zadnjih 30 dana trčanja → `run_logs` (workout_id match po datumu i tipu kad je 1:1),
  dedupe po (datum, distanca ±0.05 km, trajanje ±60 s), nikad preko postojećih ručnih logova.
  Web build: sekcija prikazuje „dostupno u aplikaciji" (plugin bridge mock u E2E).
- **Splash**: web overlay sa animiranim runnerom (SVG + CSS, reduced-motion statično, min ~700 ms),
  FullScreenLoader isti motiv; native splash preko `@capacitor/splash-screen` + generisane slike.

## Pravila

Kao i do sada: 44 E2E zelen posle svake faze, typecheck/test/lint, bez komentara, sr/en, bez novih
depova osim Capacitor paketa i health pluginova (odobreno).
