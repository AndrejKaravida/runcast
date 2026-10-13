# F26 — Readiness u dnevnu procenu (umoran + quality → predlog zamene)

Cilj: readiness (F22) ulazi u dnevnu procenu treninga: ako je korisnik „Umoran" a danas je
quality trening, hero kartica prikazuje predlog (zameni laganim danom / razmisli o tempu) —
analogno vremenskom assessment-u, ali kao nezavisan izvor.

## Trenutno stanje

- `assessWorkoutWeather` → `WeatherAssessment { code, severity: 'ok'|'warn'|'swap', details }`;
  `assessmentText()` u `weather-utils.tsx` mapira kod → tekst (`workout:assessment.*`);
  `pickSwapCandidate` bira lagani dan za zamenu; `TodayHeroCard` prikazuje `WeatherBanner`
  kad ima verdict/reschedule. Assessment je vezan na `weather.data`.
- Readiness: F22 (`useReadiness`/adapter + `ReadinessCard` na Danas, nivo fresh/normal/tired).

## Implementacija

1. **Kombinovanje u TodayPage**: izračunaj `readinessAssessment` nezavisno od vremena:
   `level === 'tired'` i `todayWorkout` je quality (TEMPO/INTERVALS/REPETITIONS) → predlog:
   - sa dostupnim laganim danom u nedelji (postojeći `pickSwapCandidate` sa tipovima) →
     `severity 'swap'`, akcija „Zameni laganim danom" (postojeći swap tok);
   - bez kandidata → `severity 'warn'`, samo tekst.
     Prioritet bannera: vremenski assessment prvi; readiness banner se prikazuje kad vremenski
     nema ništa (ili je 'ok').
2. **Tekst**: novi ključevi `today:readinessAssessment.title/description/swapAction` (sr/en,
   humanizovano) — **today.json**, ne workout.json (paralelni agent drži workout.json).
   `TodayHeroCard` proširiti da prima readiness verdict/reschedule pored vremenskih (najmanje
   invazivno: spojiti u iste prop-e u TodayPage, ili dodati `readinessVerdict` prop — agent
   bira najčistije uz postojeći WeatherBanner).
3. **ReadinessCard**: kad je predlog prikazan, kartica ne duplira isti hint (sakrij hint liniju
   koja se poklapa ili prikaži kraću formu — bez dupliranja teksta).
4. **E2E** `readiness-assessment.spec.ts`: mock readiness „tired" + danas quality trening →
   hero prikazuje predlog + „Zameni laganim danom" radi (trening se pomera); mock „fresh" →
   bez predloga; vremenski banner ima prioritet kad oba postoje.

## Van v1

Auto-prilagođavanje tempa sesije po readiness-u, readiness uticaj na nedeljni plan, push
ujutru.
