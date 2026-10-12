# F8 (R3) — Plan: Kalendar sync (ICS izvoz)

## UX — Settings, sekcija „Plan"

- U kartici „Plan“ (ispod reda `plan.weeks`/`days_per_week`, iznad „Generiši novi plan“) nova
  sekundarna akcija **„Izvezi plan (.ics)“** (`AppButton variant="secondary"`, `w-full`).
  Prikazuje se samo kad plan postoji; bez plana ništa se ne menja.
- Klik: fetch svih treninga aktivnog plana → build ICS → `runcast-plan.ics` download preko
  Blob + `<a download>`; loading na dugmetu; uspeh → postojeći `notice`: „Plan je izvezen.“;
  greška → postojeći `error`: „Izvoz nije uspeo — hajde ponovo.“
- Sadržaj: SVI treningovi plana (`plan.start_date` … `plan.race_date`) osim REST —
  EASY/LONG/TEMPO/INTERVALS/REPETITIONS/RACE + STRENGTH (uključujući „Mobilnost 20 min“).
  Ne filtriraju se prošli treninzi (ceo plan, deterministično i lakše proverljivo).
- Vremena: timed eventi; sat iz `run_window` profila — morning 07:00, evening 18:00,
  flexible 09:00 (jedna konstanta `RUN_WINDOW_START_HOUR` u `ics.ts`). Trajanje:
  `durationSec` → zbir `steps[].durationSec` → `distanceKm × easySlowSecPerKm` →
  default 6:00/km; zaokruženo na minut, min 1 min.
- SUMMARY = `workout.title`; DESCRIPTION = naslov + numerisani koraci
  (`1. E tempo · 8 km · 5:40 /km`, snaga `1. Čučnjevi — 2×12 · 1 min`) + „RunCast plan“.
- Bez modala, bez nove stranice, bez izmena postojećih polja i selektora.

## UX — WorkoutPage, mali link „Dodaj u Google kalendar"

- Ghost akcija `size="sm"` u gornjem redu (pored „Preskoči“), kao `<a target="_blank"
rel="noopener noreferrer">` stilizovan `AppButton`-om, `data-testid="add-google"`.
- Prikazuje se za sve tipove osim REST (REST nema događaj); i za DONE/SKIPPED.
- `href` = `buildGoogleCalendarUrl(event)` — isti sat/trajanje/opis kao ICS; korisnik u
  Google editoru potvrđuje Save. Bez fallback-a: sat dolazi iz profila, ne iz plana.
- Copy: „Dodaj u Google kalendar“ (aria-label isti).

## Srpski copy i selektori

- `Izvezi plan (.ics)` · notice `Plan je izvezen.` · greška `Izvoz nije uspeo — hajde ponovo.`
- `Dodaj u Google kalendar` (link) — bez promene postojećih stringova.
- E2E selektori koji ostaju netaknuti: `Generiši novi plan`, `Generiši`, `Sačuvaj profil`,
  `Ova nedelja`, `week-row`, `Koraci`, `Urađeno`, `Preskoči`. Novo dugme ima drugačiji
  accessible name → nema kolizije sa `getByRole('button', { name: ... })` upitima.

## Acceptance criteria

- [ ] Settings sa aktivnim planom prikazuje `Izvezi plan (.ics)`; bez plana dugme ne postoji.
- [ ] Klik preuzima `runcast-plan.ics`; sadržaj počinje `BEGIN:VCALENDAR`, ima `VERSION:2.0`,
      `PRODID`, završava `END:VCALENDAR`; sve linije CRLF, nijedna >75 okteta.
- [ ] Tačno jedan VEVENT po non-REST treningu plana; STRENGTH (Snaga/Mobilnost) uključen;
      REST izostavljen; UID-ovi jedinstveni i stabilni (`workout-<id>@runcast.app`).
- [ ] morning → `DTSTART:…T070000`, evening → `T180000`, flexible → `T090000`;
      `DTEND` = start + trajanje; bez `Z` i bez `TZID` (floating).
- [ ] DESCRIPTION sadrži numerisane korake; dijakritika i `,`/`;`/`\` pravilno escape-ovani.
- [ ] WorkoutPage: `Dodaj u Google kalendar` vodi na
      `calendar.google.com/calendar/render?action=TEMPLATE` sa `text`/`dates`/`details`
      (bez `Z`, bez `ctz`); na REST treningu link ne postoji.
- [ ] Postojeći E2E selektori na Settings/WorkoutPage netaknuti; 320px bez overflow-a.
- [ ] `npm run typecheck`, `npm run test`, `npm run lint -w app` zeleni; bez novih depova,
      bez izmena šeme/baze i bez novih `queries.ts` mutacija osim export hooka.

## Out of scope / open questions

- **webcal subscription feed**: zahteva javni endpoint + privatni token + infra (Runna model);
  v1 je fajl-download — vidi `research.md`. Re-export posle regeneracije plana je očekivan.
- **Today akcija**: TASKS-v1.2 (R3) pominje „Settings + Today akcija“, ali ovaj brief traži
  Settings + WorkoutPage. Predlog: Today ostaviti netaknut (vlasništvo F1/F2) — potvrditi.
- **REST dani**: izostavljeni umesto all-day „Odmor“; alternativa odbačena kao šum.
  Ako vlasnik želi „Odmor“ u kalendaru, dodaje se kao all-day event (DTEND +1 dan).
- **flexible → 09:00** nije u brief-u (brief definiše 7:00/18:00) — izabrano kao kompromis
  van oba weather prozora; konstanta se lako menja.
- **Trajanje** za TEMPO/INTERVALS koristi easy pace (brief), što blago precenjuje blok;
  preciznija alternativa (parse `step.pace`) odbačena u v1 radi jednostavnosti.
- **Vremenska zona u profilu** ne postoji; ako se doda, prelazak na TZID + VTIMEZONE je
  izolovan u `ics.ts` (jedna funkcija).
