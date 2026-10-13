# F9 (R3) — Plan: Gamifikacija (dostignuća + nedeljni izazov)

## Principi (iz `research.md`)

- Dostignuća se izvode iz postojećih podataka (`workouts`, `run_logs`, `profiles`); nema novih
  tabela, upisa ni resetovanja — propust samo pomera progres, nikad ne oduzima.
- Grid po familijama sa progresom (bez zida zaključanih pločica); self-challenge jer u v1 nema
  drugih korisnika; jedno diskretno slavlje po akciji, reduced-motion safe.

## Set dostignuća (9 familija / 20 nivoa)

| Familija      | Pragovi                | Pravilo (sve iz `workouts` + `run_logs`)                                                                                          |
| ------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `first`       | 1                      | prvi DONE run trening (`EASY/LONG/TEMPO/INTERVALS/REPETITIONS/RACE`)                                                              |
| `sessions`    | 5 / 10 / 25 / 50       | broj DONE run treninga                                                                                                            |
| `streakWeeks` | 4 / 8 / 12             | uzastopne ISO nedelje (pon–ned) sa ≥1 DONE run; tekuća nedelja ulazi ako već ima DONE run; puna nedelja bez DONE runa prekida niz |
| `long`        | 10 / 15 / 20 / 30      | max efektivna km DONE `LONG` treninga (log distance ako postoji, inače planirana)                                                 |
| `tempo`       | 1                      | prvi DONE `TEMPO`                                                                                                                 |
| `km`          | 100 / 250 / 500 / 1000 | kumulativna suma `run_logs.distance_km` po datumu (isto kao „Ukupno pređeno")                                                     |
| `race`        | 1                      | prvi DONE `RACE`                                                                                                                  |
| `strength`    | 10                     | broj DONE `STRENGTH` treninga                                                                                                     |
| `pb`          | 1                      | prvi put da log na standardnoj distanci (5/10/21.0975/42.195, ±2%) obori sopstveni prethodni najbolji rezultat                    |

- `unlockedAt` = datum treninga/loga koji je prešao prag (za `sessions`/`strength` = datum
  N-tog događaja hronološki; za `km` = datum prelaska kumulativne sume; za `pb` = datum loga
  koji je oborio prethodni best); `progress` = trenutna vrednost do praga.
- Tier (1–4) je samo vizuelni: 1 neutral, 2 primary, 3 warning, 4 success (postojeći tone-ovi).
- `sessions`/`race`/`long`/`strength` broje DONE treninge; `km` se oslanja na logove — DONE run
  bez loga (moguć kroz „Završi trening") ulazi u `sessions`, ali ne u `km` (konzistentno sa Stats).

## Nedeljni izazov (self-challenge iz plana)

- `weeklyChallenge(plan, workouts, today)`: tekuća ISO nedelja unutar plana
  (`plan.start_date`…`plan.race_date`); van plana → `null`.
- Meta: broj planiranih run treninga te nedelje; ako postoji `LONG` — i „dugi trk".
  Napredak: broj DONE te nedelje; `complete` kad su svi planirani run treninzi DONE.
- Copy (shared, kao ostali moduli): `Ovu nedelju: 3/4 treninga · dugi trk ✓`.
- Nema kazne za propušteno; izazov se sam obnavlja svake nedelje (bez upisa).

## Celebration UX

- Posle uspešnog `LogWorkoutModal`/„Završi trening": ako postoji novo (ne-`seen`) dostignuće sa
  `unlockedAt === today`, prikazati **jedan** `AchievementToast` iznad tab bara: ikona +
  „Novo dostignuće" + naslov + kratak opis; auto-dismiss ~5 s; dugme za zatvaranje;
  `role="status"` + `aria-live="polite"`; slide/fade 200–250 ms; bez konfeta; pod
  `prefers-reduced-motion` instant (bez animacije).
- Ako se otključa više nivoa odjednom (npr. `sessions.5` + `km.100`), prikazuje se najviši
  tier, ostali se tiho markiraju kao viđeni.
- Prvi mount: sva dostignuća sa `unlockedAt < today` se markiraju kao viđena — nema zaostalih
  proslava za staru istoriju.
- Today: **tihi red** u kartici „Ova nedelja" — `Nedeljni izazov · 2/4 treninga · dugi trk ✓`
  (bez slavlja; progres je dovoljan).
- Stats: sekcija **„Dostignuća"** — grid familija; osvojeni nivoi kao `AppBadge` čipovi,
  zaključane familije sa progres barom i tekstom „još X do {prag}"; bez modala.

## Gde živi

- Stats: nova sekcija posle `PersonalBestsCard`, pre „Poslednje zabeleženo".
- Today: tihi red u `week-board` kartici + `AchievementToast` mount.
- WorkoutPage: `AchievementToast` mount (logovanje sa detalja treninga).
- GuidedRunPage: pokriven indirektno (isti modal; toast se prikaže na ciljnoj strani).
- localStorage ključ: `runcast.achievements.seen` (JSON niz id-jeva), kao `runcast.coach.applied`.

## Srpski copy (u shared, lokalizuje se kasnije)

- Naslovi: `Prvi trening`, `5 treninga`, `10 treninga`, `25 treninga`, `50 treninga`,
  `Nedelje u nizu 4/8/12`, `Prvi long 10/15/20/30 km`, `Prvi tempo`, `100/250/500/1000 km ukupno`,
  `Trka odrađena`, `Snaga 10×`, `Novi lični rekord`.
- Sekcija: `Dostignuća`; prazno stanje: `Prvi bedž je najslađi — samo zabeleži trening.`
- Toast: `Novo dostignuće` + naslov + opis; izazov: `Ovu nedelju: {done}/{target} treninga`.

## Acceptance criteria

- [ ] `computeAchievements` vraća sve pragove deterministički, stalne id-jeve; ignoriše buduće
      datume (`workout_date`/`log_date` ≤ `today`).
- [ ] Stats: 9 familija vidljivo; osvojeni čipovi + progres do sledećeg praga; prazno stanje.
- [ ] Logovanje treninga → tačno jedan toast za najviši novi nivo; posle reload-a nema
      ponovnog toasta (`seen` u localStorage).
- [ ] `unlockedAt` odgovara datumu koji je prešao prag (unit testovi graničnih slučajeva).
- [ ] `weeklyChallenge` vraća `null` van plana; tačan `done/target`; dugi trk samo ako je planiran.
- [ ] Reduced motion: bez animacije; `aria-live="polite"`; toast ne blokira i ne odlaže UI.
- [ ] Postojeći E2E (app/responsive/…) prolaze bez izmena; novi `achievements.spec.ts` zelen.
- [ ] Bez novih depova i izmena šeme; `npm run typecheck`, `npm run test`, `npm run lint -w app` zeleni.

## Out of scope / open questions

- Deljenje dostignuća, leaderboardi, društveni feed — nema drugih korisnika u v1.
- Push notifikacije i „streak freeze" — nema dnevne obaveze; nedeljni niz je blag.
- `seen` je per-uređaj (localStorage); promena uređaja/reset ponovo prikaže toast za tekući dan —
  prihvaćeno jer nema nove tabele.
- `profile` ulazi u API potpis zbog brief-a, ali v1 pravila ga ne koriste (rezervisan za buduća
  dostignuća npr. „prvi plan" / experience-based copy) — potvrditi da ostaje u potpisu.
- Ton i broj nivoa se mogu kalibrisati posle prvih korisnika; familije su izolovane.
