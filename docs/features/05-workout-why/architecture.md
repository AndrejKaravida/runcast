# F5 — Arhitektura: `explain.ts` + `WhyCard`

## API (packages/shared/src/explain.ts, pure TS)

```ts
export interface ExplainInput {
  type: WorkoutType;
  phase: PlanPhase;
  paceZone: PaceZone | null;
  distanceKm: number;
}
export interface ExplainOptions {
  paces?: PlanPaces | null;
}
export interface WorkoutExplanation {
  why: string;
  how: string[];
  mistake: string;
  effort: string;
}
export function describeWorkout(input: ExplainInput, options?: ExplainOptions): WorkoutExplanation;
```

- Bez DOM/fetch; `index.ts` dobija `export * from './explain';` (jedna linija).
- Pace hint: ako `paces` i `paceZone` postoje, `how[0]` dobija formatiran tempo preko `formatPace`
  iz `vdot.ts`; zona → polje: E = `easyFast–easySlow`, M = `marathon`, T = `threshold`,
  I = `interval`, R = `repetition` („R tempo ~4:10 /km"). Bez `paces` → bez brojeva.
- `type === 'LONG' && distanceKm > 0` → `why` počinje sa „Dugi trk {distanceKm} km — …".
- Sastavljanje: `why = TYPE_CONTENT[type].why + ' ' + PHASE_NOTE[phase]`;
  `effort = TYPE_CONTENT[type].effort + (EFFORT_NOTE[phase] ?? '')`. Exhaustive `Record<WorkoutType, …>`
  garantuje compile-time pokrivenost i novog `STRENGTH` tipa.

## Sadržajna mapa (srpski) — osnova po tipu

| Tip         | why (šta gradi)                                                                                                       | how (2 bulleta)                                                                                                                 | mistake                                                                                  | effort                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| EASY        | Lagano trčanje gradi aerobnu bazu i oporavlja te između teških treninga — zato je sporo namerno.                      | Drži razgovorni tempo cele deonice. / Ako „uletiš" brže, uspori: plafon je brzina, ne cilj.                                     | „Laki" dan na umerenom tempu (RPE 6) — tada nijedan dan nije ni lak ni težak.            | RPE 3–4 — pričaš u punim rečenicama bez gubljenja daha.        |
| LONG        | Gradi izdržljivost, ekonomičnost i mentalnu čvrstinu za završnicu trke.                                               | Kreni mirno, prvih 5 km najsporije. / Hidriraj se i testiraj opremu kao na trci.                                                | Prebrz početak te iscedi pred kraj — trk treba da ti da samopouzdanje, ne da te slomi.   | RPE 4–5 (kraj do 6) — pričaš u rečenicama, dišeš kontrolisano. |
| TEMPO       | Tempo rad podiže laktatnu barijeru — tempo koji držiš ~1 h vremenom postaje lakši.                                    | Zagrevanje 2 km pa tempo blok ravnomerno, bez sursa. / Ako pređeš u „govor u jednom slovu", preterao si.                        | Tempo na 5 km brzini nije tempo — postaje VO2max sesija i traži previše oporavka.        | RPE 6–7 — „komotno teško", govoriš u kratkim frazama.          |
| INTERVALS   | Intervali podižu VO2max — plafon aerobne snage i brzinu koju možeš da održiš.                                         | Prva 1–2 ponavljanja mirnije, poslednje jako kao prvo. / Oporavak: lagan trk ili hod, smiri disanje.                            | Prejak start → besmislen umor umesto produktivnog; rezultati opadaju iz repa u rep.      | RPE 8–9 — teško ali kontrolisano, tehnika se ne raspada.       |
| REPETITIONS | Repeticije ne grade izdržljivost — bruse mehaniku, korak i ekonomičnost trčanja.                                      | Svako ponavljanje brzo i opušteno, bez grča. / Pun oporavak pre sledećeg (hod/džog).                                            | Trčanje R tempa kao intervala: bez punog oporavka mehanika se kvari i nema stimulusa.    | RPE 9 — kratko i čisto; kad tehnika padne, prekini seriju.     |
| RACE        | Dan za koji je ceo plan rađen — provera forme, taktike i glave.                                                       | Prvu polovinu kontrolisano, bez jurnjave za tuđim tempom. / Drži se svog plana tempa do kraja.                                  | Prebrz start sagoreva energiju — najčešći razlog pada u drugoj polovini.                 | RPE 8–10 — jako, ali po planu; poslednja trećina sme da boli.  |
| REST        | Odmor nije pauza od treninga — adaptacija se dešava dok se telo oporavlja.                                            | Šetnja, mobilnost ili lagano istezanje 15–20 min. / Prioritet: san 7–9 h i normalna ishrana.                                    | Popunjavanje dana „junk" kilometrima ili osećaj krivice — odmor je deo plana.            | RPE 0–2 — danas ne treniraš, danas se gradiš.                  |
| STRENGTH    | Snaga stabilizuje zglobove i ispravlja disbalanse — manje povreda i ekonomičniji trk (+8–12% za 1–2 sesije nedeljno). | Kontrolisana forma iznad težine; zadnja 1–2 ponavljanja izazovna ali čista. / Ne diraj teško noge dan pre ključne trčne sesije. | Preteško i preblizu kvalitetnog trčanja — snaga tada krade oporavak umesto da ga podrži. | RPE 6–8 — osećaš rad mišića, forma ostaje čista.               |

## Faze — dodatak na `why` (komplettira 8×5 matricu)

| Faza  | PHASE_NOTE                                                           |
| ----- | -------------------------------------------------------------------- |
| BASE  | Sada gradiš bazu i naviku — volumen raste, intenzitet ostaje nizak.  |
| BUILD | Faza gradnje: na bazu dodajemo kvalitet i držimo rast pod kontrolom. |
| PEAK  | Vrhunac pripreme: najzahtevniji rad, umor je očekivan i dozvoljen.   |
| TAPER | Taper: volumen opada da bi na start stigao svež.                     |
| RACE  | Sve je podređeno trci ove nedelje — dan koji je platio sav rad.      |

`EFFORT_NOTE: Partial<Record<PlanPhase, string>>` = TAPER: „ Drži donji kraj raspona.",
RACE: „ Danas je dozvoljeno sve." (ostale faze bez dodatka). Nedostižne kombinacije
(npr. TEMPO×BASE) i dalje vraćaju smislen tekst: osnova tipa + faza note.

## WhyCard (app/src/components/workouts/WhyCard.tsx)

```tsx
interface WhyCardProps {
  explanation: WorkoutExplanation;
}
export function WhyCard({ explanation }: WhyCardProps);
```

- `AppCard`, `data-testid="why-card"`, `className="space-y-3"`.
- Header red: `<p className="text-sm font-semibold">Zašto ovaj trening</p>` + `AppBadge tone="primary"`
  sa `explanation.effort` (tekst „RPE …", najviše 2 reda).
- `why`: `<p className="text-sm text-text-secondary">`.
- `how`: `<ul className="divide-y divide-border">`, `li` kao u „Koraci" (`py-2 text-sm`).
- `mistake`: `<div className="rounded-xl bg-warning-soft p-3 text-xs text-warning">` sa bold labelom
  „Česta greška" i tekstom ispod.
- Bez stanja, hookova i animacija; jasno čitljiv na 320px (bez ikona i bez horizontalnog overflow-a).

## WorkoutPage integracija

- `import { describeWorkout, type PaceZone, type PlanPaces, type PlanPhase, type WorkoutType } from '@runcast/shared';`
- `const { data: plan } = useActivePlan();` — keširano, bez nove mrežne runde na ovoj strani.
- `const explanation = describeWorkout({ type: workout.type as WorkoutType, phase: workout.phase as PlanPhase, paceZone: workout.pace_zone as PaceZone | null, distanceKm: workout.distance_km }, { paces: (plan?.paces ?? null) as unknown as PlanPaces | null });`
- Render: `<WhyCard explanation={explanation} />` između header `AppCard`-a (posle reda 89) i
  `steps.length > 0` bloka (red 91) — pre „Koraci".
- Ostali blokovi (log, weather, `Urađeno`/`Preskoči`, `ConfirmDialog`) se ne dodiruju →
  postojeći selektori ostaju validni (`Koraci`, `Urađeno`, `Preskoči`, „Vreme za termin 06–09 h").

## Unit testovi (explain.test.ts, vitest, bez novih dep-ova)

1. `for (const type of WORKOUT_TYPES) for (const phase of PHASES)`: `why`/`mistake`/`effort` ne-prazni,
   `how.length >= 2`, svaki `how[i]` ne-prazan, `effort` sadrži „RPE".
2. Faza menja tekst: `EASY BASE ≠ EASY TAPER`, `LONG BUILD ≠ LONG PEAK`, `REST BASE ≠ REST RACE` (why).
3. Pace hint: uz `paces` i `paceZone 'T'`, `how[0]` sadrži `formatPace(thresholdSecPerKm)` i „/km";
   bez `paces` nijedan `how` ne sadrži „/km".
4. LONG `distanceKm: 18` → `why` sadrži „18"; `REST` sa `distanceKm: 0` ne puca i `paceZone: null` ok.
5. STRENGTH sa `paces` i `paceZone null` nema pace hint; `how.length === 2`.

## E2E (app/e2e/why.spec.ts — potvrditi dozvolu fajla, open question #2)

- `register` + `completeOnboarding` iz `helpers.ts`; isti `page.route` mock-ovi za forecast/AQI kao `app.spec.ts`.
- `/plan` → klik na „Sledeći mesec" dok ne postoji `a[aria-label*="Tempo"]` (BUILD počinje ~6. nedelje
  za 18-nedeljni plan), pa klik na prvi Tempo link → `**/workout/**`.
- Asertacije: `getByText('Zašto ovaj trening')` vidljiv; effort badge `/RPE \d/` vidljiv;
  `getByText('Koraci')` i dalje vidljiv (regresija nije uvedena). Bez izmena postojećih spec fajlova.
