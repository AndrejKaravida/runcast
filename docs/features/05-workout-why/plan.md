# F5 — Plan: „Zašto ovaj trening" vodič

## Prikaz — šta, gde, kada

### WorkoutPage (obavezan deo)

- Nova `WhyCard` sekcija odmah ispod header kartice (datum/naslov/badževi), iznad `Koraci`.
  Redosled: kontekst → zašto → koraci → log/vreme/akcije.
- Podaci iz `describeWorkout({ type, phase, paceZone, distanceKm }, { paces })`;
  `paces` dolazi iz `useActivePlan()` (već keširan sa Today/Plan strana); bez plana → bez pace brojeva.
- Kartica se prikazuje za sve tipove uključujući REST i STRENGTH; REST ima kraću karticu
  (WhyCard bez `how` liste može ostati samo `why` + `effort` + `mistake`).
- Naslov sekcije: „Zašto ovaj trening". Effort kao `AppBadge` (npr. „RPE 6–7").

### Today hero (uslovno — potrebna odluka)

- Ideja: jedna linija (`why` prva rečenica) ispod podnaslova hero kartice, `text-xs text-text-muted`,
  kao „mali hint" pre nego što korisnik otvori detalj.
- BLOKER: `TodayPage.tsx` NIJE u F5 dozvoljenim fajlovima (CONTRACTS.md tabela, red F5).
  Ne dirati ga bez izmene ugovora; vlasnici TodayPage-a su F1 (dugmad) i F2 (strength grane).
- Fallback koji ne krši ugovor: hint izostaviti; „Detalj treninga" već vodi na punu WhyCard sekciju.

### Sadržaj po tipu × fazi (struktura kartice)

- `why`: 1–2 rečenice — šta tip gradi + zašto sada (faza). Za LONG ubaciti distance iz plana.
- `how`: 2 bullet-a izvedbe (početak/ravnomernost, oporavak/hidratacija) — najviše 3.
- `mistake`: 1 rečenica — najčešća greška za tip (npr. easy prebrzo, interval prejak start).
- `effort`: 1 linija — RPE raspon + verbalni test („pričaš u punim rečenicama", „kratke fraze").
- REST: why = oporavak je deo treninga; effort = RPE 0–2. STRENGTH: why = prevencija povreda +
  ekonomičnost; effort = RPE 6–8 uz čistu formu.
- Faze ne menjaju formu treninga nego „zašto sada": BASE = baza/navika, BUILD = uvodimo kvalitet,
  PEAK = najzahtevniji rad i akumulirani umor je očekivan, TAPER = svežina za start, RACE = dan istine.

### Interakcija i stanja

- Nema nove mreže ni mutacija; kartica je čisto čitanje. Loading/error rešava postojeći WorkoutPage skeleton.
- Bez animacija; reduced-motion nije relevantan (statičan sadržaj).

## Acceptance criteria

- [ ] `describeWorkout` vraća neprazne `why`/`mistake`/`effort` i `how` dužine ≥ 2 za svih 8 tipova × 5 faza.
- [ ] Tekst se razlikuje po fazi za tipove koji se javljaju u više faza (npr. EASY BASE ≠ EASY TAPER).
- [ ] WhyCard se vidi na WorkoutPage za TEMPO, LONG, EASY, REST i STRENGTH; sadržaj kratak (2–4 kratka bloka).
- [ ] Postojeći E2E selektori na WorkoutPage netaknuti: `Koraci`, `Urađeno`, `Preskoči`,
      „Vreme za termin 06–09 h" (weather kartica), badge `Planirano/Urađeno/Preskočeno`.
- [ ] Novi E2E: na TEMPO strani vidi se „Zašto ovaj trening" + effort badge sa RPE.
- [ ] `npm run typecheck`, `npm run test`, `npm run lint -w app` zeleni; bez novih dependency-ja.
- [ ] 320px bez horizontalnog overflow-a; ćirilica/latinica dosledno postojećem UI (latinica).

## Out of scope

- Izmena `TodayPage.tsx` (hero hint) dok se CONTRACTS.md ne ažurira — open question #1.
- Izmene guided runnera, Stats strana, baze/migracija, plan-generatora.
- Personalizacija po VDOT vrednosti; samo tempo brojevi iz `paces` kada postoje.
- AI/dinamički tekst; statička biblioteka + interpolacija tempa.
- Prevod postojećih `steps` labela; WhyCard ne duplira Korake (zašto ≠ šta).

## Open questions

1. **Today hero hint**: F5 lista fajlova ne uključuje TodayPage. Opcije: (a) izostaviti hint,
   (b) vlasnik F1/F2 doda jednu liniju uz svoj dodir TodayPage-a, (c) izmeniti CONTRACTS.md pre F5.
2. **E2E fajl**: predlog `app/e2e/why.spec.ts` (nov, po pravilu 5 iz CONTRACTS) nije eksplicitno
   u F5 listi; potvrditi pre implementacije ili dodati minimalni test u postojeći spec.
3. **`plan.paces` tip**: u bazi `Json`; potvrditi `as unknown as PlanPaces | null` pattern
   (isti kao `queries.ts` cast pri upisu).

## Rizici

- Dupliranje sa `steps` labelima — držati WhyCard na nivou svrhe/izvedbe, bez ponavljanja koraka.
- Predugačak tekst na 320px — max 2 bullet-a i 1 rečenica greške; inače skratiti u content mapi.
