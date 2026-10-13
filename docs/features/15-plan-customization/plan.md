# F15 — Custom dani plana (izbor konkretnih dana u nedelji)

Cilj: korisnik bira **tačno koje dane u nedelji trči** (osim dugog trka koji je i dalje
poseban izbor), umesto da generator sam raspoređuje quality/easy dane.

## Trenutno stanje (recon)

- `packages/shared/plan-generator.ts` `buildLayout:120-134`: long run fiksiran na
  `longRunDay`; quality dani = offseti `[2,4,5,3]` (izbegava dan pre/na/posle long);
  easy popunjava `[2,4,3,5,1,0,6]`. Nema načina da korisnik „zakuca" dane.
- `GeneratePlanInput` (`plans/queries.ts:8-15`): `daysPerWeek 3-6`, `longRunDay` (0-6),
  experience, volumeBand, race, recentRace. Onboarding prikazuje nedeljnu mrežu samo kao
  vizualizaciju (`OnboardingPage.tsx:311-327`).
- `PlanFields.tsx` variant `settings`/`onboarding`: race grupa, goal, schedule (daysPerWeek
  segmented + longRunDay select), experience.

## Implementacija

1. **Shared generator**: `buildLayout` prima `runDays?: number[]` (konkretni weekday indeksi,
   uključuju longRunDay). Validacija: `runDays.length === daysPerWeek`, sadrži `longRunDay`,
   bez duplikata. Kad `runDays` postoji: long run ide na `longRunDay`, quality dani se biraju
   iz `runDays` po istom prioritetnom redu ali samo iz skupa, easy popunjava ostatak skupa.
   Bez `runDays`: tačno postojeće ponašanje (backward compatible). Unit testovi za oba puta.
2. **Tipovi/flow**: `GeneratePlanInput.runDays?: number[]`; `PlanDraft.runDays: number[]`;
   `buildPlanInput` prosleđuje; `create_plan_with_workouts` RPC ne menja potpis (workouti se
   i dalje generišu iz layouta).
3. **UI (`PlanFields` schedule grupa)**:
   - Nedeljna mreža (pon–ned) postaje **interaktivna**: klik na dan ga uključuje/isključuje.
   - Dugo trčanje: klik na dan uz radio/marker (dug run je jedan od izabranih dana).
   - Broj izabranih dana = `daysPerWeek` (segmented ostaje kao brzi izbor; menjanje
     `daysPerWeek` automatski dodaje/uklanja dane po generator default redu).
   - Validacija u `validatePlanDraft`: tačno N dana, long run među njima.
   - Defaulti: postojeći automatski raspored za trenutne vrednosti (da onboarding helper u
     E2E prolazi bez izmena).
4. **Settings plan stranica**: isti kontrol (regeneracija plana) + prikaz trenutnih dana iz
   aktivnog plana.
5. **E2E**: onboarding sa custom danima (npr. uto/čet/sub + ned long) → plan kalendar
   prikazuje treninge tačno tih dana; validacija (N-1 dana → greška); settings regeneracija.

## Edge slučajevi

- Promena `longRunDay` na dan koji nije u `runDays` → auto-dodaj ga i ukloni najniže
  prioritetni dan.
- `daysPerWeek` < izabranih dana → trim; > → dopuni default redom.
