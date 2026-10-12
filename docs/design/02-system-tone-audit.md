# 02 — Audit sistema i tona (RunCast, T1 / agent A2)

Područje: tipografska skala, spacing/radius/ivice/senke, ikonografija, motion i sav UI tekst. Ovo je
specifikacija — kod se ne menja u ovoj fazi. Reference: Strava (3-up stat grid, 11pt uppercase labele,
tabularne cifre svuda), Runna (boja po tipu treninga, tih coach ton, kalendar kao dom), Apple Fitness
(surface-step elevacija umesto senki), Oura (stat-tile labela/vrednost, boja = značenje). Stek ostaje:
Tailwind v4.3, lucide 1.55, motion, Inter Variable.

## 1) Copy audit

Ton (važi za sve predloge): coach u „ti", jedna rečenica + najviše jedan detalj; prvo činjenica, pa
akcija; bez krivice („izostalo je", ne „propustio si"); broj uvek sa jedinicom; max jedan uzvičnik po
ekranu; bez emotikona i slenga.

| Pre (trenutno)                                                                                | Posle (predlog)                                                                                                            | Gde                           |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Detalj treninga                                                                               | Pogledaj trening                                                                                                           | Today CTA, Workout, GuidedRun |
| Ostavi kako je                                                                                | Ostajem po planu                                                                                                           | rain banner dismiss           |
| Ova nedelja                                                                                   | Tvoja nedelja                                                                                                              | Today week board, PlanPage    |
| Sledeće                                                                                       | Sledeći trening                                                                                                            | NextWorkoutCard               |
| Niz trčanja / Niz dana                                                                        | Dani u nizu                                                                                                                | Today chip, Stats tile        |
| Za danas nema treninga u planu / Pogledaj kalendar za ostatak nedelje.                        | Danas je slobodan dan / Baci pogled na kalendar — sledeći trening te čeka.                                                 | Today empty                   |
| Nema aktivnog plana                                                                           | Još nemamo plan                                                                                                            | Today, Plan, Settings, Stats  |
| Napravi plan u podešavanjima — izaberi trku, tempo i raspored.                                | Hajde da napravimo tvoj plan — trka, tempo i dani koje imaš.                                                               | empty state                   |
| Propustio si 3 treninga u poslednje dve nedelje                                               | Tri treninga su izostala — desi se                                                                                         | coach.ts title                |
| RPE je visok (prosek 8,7)                                                                     | Telo traži predah (prosek RPE 8,7)                                                                                         | coach.ts                      |
| Poslednjih pet treninga traži mnogo od tebe. Uzimamo korak nazad.                             | Pet treninga je bilo naporno. Uzimamo korak nazad — oporavak je trening.                                                   | coach.ts                      |
| RPE blago raste (prosek 7,8) / Volumen ostaje isti dok se ne stabilizuje.                     | Umor se polako skuplja (prosek 7,8) / Volumen ostaje isti dok se ne vratiš u ritam.                                        | coach.ts                      |
| Dugi trk nije ispunjen                                                                        | Dugi trk je izostao                                                                                                        | coach.ts                      |
| Ne nadoknađujemo kilometre — sledeća nedelja ostaje po planu.                                 | Kilometri se ne nadoknađuju. Sledeća nedelja ostaje tačno po planu.                                                        | coach.ts                      |
| Sve po planu — možeš malo više                                                                | Sve teče po planu — možemo malo jače                                                                                       | coach.ts                      |
| Ostavi kako je / Smanji 10% / Povećaj 10%                                                     | Bez promene / Olakšaj 10% / Dodaj 10%                                                                                      | coach akcije                  |
| Sve izgleda stabilno — nastavi ovako.                                                         | Sve držiš pod kontrolom — samo nastavi.                                                                                    | CoachInsightsCard             |
| Završiti pre kraja? / Trening će se završiti sa vremenom...                                   | Da završimo pre kraja? / Zabeležićemo vreme koje si do sada istrčao — ništa se ne gubi.                                    | GuidedRun confirm             |
| Preskoči trening? / Trening će biti označen kao preskočen i neće ulaziti u realizaciju plana. | Da preskočimo ovaj trening? / Označićemo ga kao preskočen. Ne utiče na realizaciju plana.                                  | Workout confirm               |
| Sledi: X. / Polovina treninga. / Pauza. / Nastavljamo. / Trening završen. Vreme X.            | Sada: X. / Pola je — drži ritam. / Pauza — diši. / Idemo dalje. / Gotovo! X u nogama.                                      | guided.ts cueTextFor          |
| Kiša — 70% šanse / Predlog: prebaci trening ili odradi indoor varijantu.                      | Kiša je verovatna — 70% / Savet: prebaci trening ili ga odradi u zatvorenom.                                               | weather-utils                 |
| Prognoza trenutno nije dostupna. Pokušaj osvežavanje. / Učitavam prognozu…                    | Prognoza trenutno ćuti. Osveži je. / Gledam prognozu…                                                                      | WeatherSummaryCard            |
| Greška pri učitavanju / Podaci trenutno ne mogu da se učitaju. Proveri vezu...                | Ne mogu da učitam podatke / Veza je trenutno slaba. Proveri internet i pokušaj ponovo.                                     | QueryError                    |
| Trening nije nađen / Možda je plan regenerisan.                                               | Ne nalazim ovaj trening / Plan je verovatno osvežen — pogledaj kalendar.                                                   | Workout, GuidedRun            |
| Vođenje nije dostupno / Vođeno trčanje postoji za treninge trčanja sa koracima.               | Za ovaj trening nema vođenja / Vođenje radi za trčanje sa koracima.                                                        | GuidedRun empty               |
| Još nema zabeleženih treninga.                                                                | Prvi trening još čeka — kad budeš spreman.                                                                                 | StatsPage, RecentActivity     |
| Dodaj poslednju trku ili ciljno vreme da dobiješ predikciju.                                  | Ubaci poslednju trku ili cilj — pokazaću ti predikciju.                                                                    | PredictorCard                 |
| Profil je sačuvan. / Novi plan je generisan, a stari zamenjen. / Generisanje nije uspelo...   | Sačuvano — profil je ažuriran. / Novi plan je spreman, stari je arhiviran. / Plan nije uspeo da se napravi — hajde ponovo. | SettingsPage                  |
| Nedeljna kilometraža (poslednjeg meseca) / Još par detalja (opciono)                          | Koliko kilometara prelaziš nedeljno? / Još samo par detalja                                                                | OnboardingPage                |
| Bez rezultata generišemo bazni plan — samo lagani treninzi.                                   | Bez rezultata dobijaš bazni plan: lagano trčanje dok ne uhvatimo formu.                                                    | OnboardingPage                |
| Napomena: bez cilja/rezultata ili sa manje od 12 nedelja do trke, plan će biti bazni...       | Bez cilja ili rezultata (ili manje od 12 nedelja do trke) dobijaš bazni plan — samo lagani treninzi.                       | Onboarding pregled            |
| Još nema ličnih rekorda — zabeleži trening na standardnoj distanci.                           | Rekorda još nema — zabeleži trku na 5, 10 ili 21 km.                                                                       | PersonalBestsCard             |
| Urađeno / planirano po nedeljama (do danas).                                                  | Koliko si istrčao od planiranog — nedelja po nedelja.                                                                      | StatsPage                     |
| Nema podataka / Napravi plan pa će statistika da se puni kako trčiš.                          | Statistika još čeka prvi trening / Napravimo plan — brojevi se pune sami.                                                  | StatsPage empty               |

## 2) Tipografija i ritam — token-level predlozi

Stanje: `--tracking-display` postoji ali se ne koristi nigde; labele su na 11px ili 12px (`text-xs`)
bez pravila; ~10 mesta ima proizvoljne vrednosti (`text-[10px]`, `text-[11px]`); nijedan broj nema
`tabular-nums`; radius tokeni (8/16/24) se ne poklapaju sa klasama (rounded-lg 8, rounded-xl 12,
rounded-2xl 16).

`app/src/styles/theme.css` — dodati u `@theme`:

```css
--text-label: 0.6875rem;
--text-label--line-height: 1; /* 11px */
--text-caption: 0.75rem;
--text-caption--line-height: 1.3; /* 12px */
--text-stat: 1.5rem;
--text-stat--line-height: 1; /* 24px */
--text-hero: 2.5rem;
--text-hero--line-height: 1; /* 40px */
--text-hero--letter-spacing: -0.02em; /* = tracking-display */
--tracking-label: 0.08em;
--ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);
```

Nove CSS-only klase (Tailwind v4 `@utility`):

- `section-label` → `font-size: var(--text-label); font-weight: 600; letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-text-muted);`
- `num` → `font-variant-numeric: tabular-nums;`
- `value-swap` → `animation: value-in 240ms var(--ease-out-soft);` + `@keyframes value-in { from { opacity: .4; transform: translateY(2px); } }`

Skala po rolama (ne po veličini):

| Rola             | Klase                                        | Gde                                                              |
| ---------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| Hero broj        | `text-hero font-bold tracking-display num`   | race countdown, guided countdown, ring centar, finished          |
| Stat vrednost    | `text-stat font-semibold num`                | stat-tile, streak, nedeljni km                                   |
| H1 stranice      | `text-xl font-semibold` (ostaje)             | Workout, Guided, auth                                            |
| Naslov kartice   | `text-sm font-semibold` (ostaje, svuda isto) | AppCard headeri                                                  |
| Sekcijska labela | `section-label`                              | menja svih 8 mesta `text-[11px]/text-xs uppercase tracking-wide` |
| Telo             | `text-sm text-text-secondary`                | opisi                                                            |
| Meta/caption     | `text-caption text-text-muted`               | datumi, jedinice, fusnote                                        |
| Broj u listi     | `text-sm font-medium num`                    | km/pace/RPE u redovima                                           |

Pravila: `num` ide na svaki broj koji se menja ili stoji u koloni (sat, tempo, km, RPE, %, datum,
streak, countdown); `tracking-display` samo za ≥24px; ukinuti sve `text-[10px]`/`text-[11px]`
(StatsPage, WeekStrip, WeatherSummaryCard, CoachInsightsCard, PersonalBestsCard, PredictorCard,
GuidedSessionCard, NextWorkoutCard, TodayPage).

Ritam (postojeći 4px grid je dobar — standardizovati ga):

- Vertikala: kartice `space-y-4`, unutar kartice `space-y-3`, labela→sadržaj `space-y-2`.
- Padding: kartica `p-4`, unutrašnji blok `p-3`, red `px-3.5 py-3`.
- Grid: `gap-3` (2 kolone stat-tile), kalendar `gap-1`.
- Zaglavlje sekcije: `flex items-center justify-between` + `section-label` levo, link `text-sm font-medium text-primary` desno.

Radius / ivice / senke (dark):

- Ladder: `rounded-2xl` površine (kartice, hero), `rounded-xl` ugnježdeni blokovi i kontrole (input, dugme, segmented), `rounded-lg` mikro-ćelije (kalendar, chip dugmići), `rounded-full` badge/ring.
- Elevacija = vrednost površine (`bg-bg → bg-surface → bg-surface-elevated`), ne senka; kartice flat sa `border-border`. Senka samo na modalu/scrimu.
- Interaktivni redovi: `hover:border-primary/40` + `active:scale-[0.99]` — isti recept svuda.
- Hero/race akcenat: `border-primary/30` + `bg-gradient-to-b from-primary-soft to-transparent`; bez drugih gradijenata.
- Fokus ostaje `focus-visible:ring-2 ring-primary/60`.

Ikonografija (lucide 1.55):

- Veličina/stroke: inline i dugmad `h-4 w-4` stroke 2; sadržaj/kartice `h-5 w-5` stroke 1.75; hero/EmptyState `h-6 w-6` stroke 1.5; tabovi `h-5 w-5` stroke 2.
- Razmak: `gap-2` u dugmadima, `gap-1.5` inline; uvek `aria-hidden` uz tekst; ikona nikad nije jedina informacija (osim IconButton sa `aria-label`).

Motion:

- Durationi: 120ms mikro, 250ms tap/step, 400ms promena sadržaja, 600ms ring/reveal (postojeći ProgressRing); easing `--ease-out-soft` za sve reveal/entrance animacije.
- Promena broja: `value-swap` na key promeni vrednosti (CSS, ne JS).
- Sve „personality" animacije moraju biti čiste CSS animacije, da globalni `prefers-reduced-motion` blok iz theme.css ostane jedini kill-switch.

## 3) Komponentni paterni (primitivi)

1. **SectionLabel** (util + opciono komponenta sa `action` slotom): `section-label`; desno link `text-sm font-medium text-primary`. Menja: „Ova nedelja", „Sledeće", „Niz trčanja", „Danas", „Koraci", „Prošla nedelja", „Vođeno trčanje", „Pripremi se" + ~6 mesta — jedna veličina/težina/spacing.
2. **Hero** (Today, Workout header): kartica + 3px traka faze (`h-1 rounded-full bg-phase`) na vrhu; eyebrow red = `section-label` (datum · faza) + status badge desno; naslov `text-2xl font-semibold`; meta red `text-sm text-text-secondary num` (tip · km · trajanje); koraci u `rounded-xl bg-surface-elevated`; CTA: primarno puna širina + sekundarno. Jedan badge po heroju, ostalo tekst — ukida „uniformnu karticu sa 5 badgeva".
3. **StatTile**: 2 kolone `gap-3`; `section-label` gore; `text-stat font-semibold num`; opciona ikona `h-4` u tonu; opciona delta `text-caption`. Zamenjuje Today race/streak chip i Stats 4 tile — jedan jezik za sve brojeve.
4. **StatRow (3-up)**: tri ćelije sa `divide-x divide-border`; labela `section-label`, vrednost `text-lg font-semibold num`. Za Workout/Guided summary; nikad više od 3 metrike u redu.
5. **ListRow**: jedan recept `flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3` + hover/press iz §2; levo naslov `text-sm font-medium` + meta `text-caption`; desno vrednost `num` + `ChevronRight h-4 text-text-muted`. Primeniti na WeekRow, NextWorkoutCard i RecentActivity red (trenutno 3 različita radiusa/paddinga za isti tip reda).
6. **EmptyState**: ikona u krugu 40px (`bg-primary-soft text-primary` ili neutral), naslov `text-base font-semibold`, opis `text-sm text-text-secondary max-w-sm`, akcija; copy po §1 tonu.

## 4) Personality kit (CSS + lucide, bez ilustracija)

Faze — boja je značenje i mora preživeti obe teme (A3 da uključi u paletu):

| Faza  | Labela    | Token         | Boja            |
| ----- | --------- | ------------- | --------------- |
| BASE  | Baza      | `phase-base`  | success #3ddc97 |
| BUILD | Izgradnja | `phase-build` | primary #ff6b4a |
| PEAK  | Vrh       | `phase-peak`  | warning #ffc24d |
| TAPER | Taper     | `phase-taper` | rain #4da6ff    |
| RACE  | Trka      | `phase-race`  | danger #ff5470  |

- Upotreba: 3px traka na hero kartici; phase chip `bg-phase-soft text-phase` (Workout header umesto „Faza: BASE"); `border-l-2` u redovima kalendarske liste; eyebrow u „Zašto ovaj trening".
- Race kartica: `border-primary/40` + gradijent `from-primary-soft`; eyebrow „Ciljna trka"; countdown `text-hero font-bold num text-primary` + „dana do trke"; caption datum + distanca; ≤7 dana → warning ton, trka-nedelja → danger ton. Bez slika.
- Streak: `Flame` + broj `num`; 0–2 muted, 3–6 primary, 7+ warning + jednokratni chip „Nedelja navike"; nikad crveno (crveno = greška/preskočeno).
- Tip treninga → ikona + boja (kalendar tačke, liste, hero eyebrow): EASY `Footprints` success; LONG `Route` rain; TEMPO `Gauge` primary; INTERVALS `Timer` warning; REPETITIONS `Zap` danger; STRENGTH `Dumbbell` warning; REST `Moon` muted; RACE `Flag` danger. Status (Urađeno/Preskočeno) ostaje badge/checkmark — ne prebojava tip.
- DONE trenutak (suptilno, CSS-only): pop checkmarke u WeekStrip (`@keyframes pop` 240ms, scale .6→1); ProgressRing već radi 600ms sweep; jednolinijski upis „Trening upisan. Lijep posao." sa `border-l-2 border-success`; 7. dan niza → chip iz streak pravila. Bez konfeta, zvuka i emotikona.
- Coach-voice šabloni za buduće stringove (T3): činjenica → akcija („Kiša je verovatna — prebaci na sutra."); validacija truda, ne rezultata („Držao si tempo cele deonice."); dozvola za pauzu („Odmor je deo plana."); greška = šta se desilo + šta dalje.

## 5) Prioriteti

**P0 — ton i hijerarhija (1 dan, bez rizika):**

1. Copy rewrite po tabeli §1 (~30 stringova, uključujući `coach.ts`, `explain.ts`, `guided.ts` u shared).
2. `section-label` util + normalizacija labela (ukloniti `text-[10px]`/`text-[11px]`).
3. `tabular-nums` na sve brojeve (stat, tempo, sat, countdown, ring, streak, km).
4. Type tokeni u `@theme` + primena na hero/stat.
5. Today hero patern + phase akcent (prvi utisak).

**P1 — sistem (1–2 dana):** 6. ListRow/StatTile/StatRow primitivi i migracija Today/Plan/Stats/Workout. 7. Phase kit + srpske labele faza kroz hero, kalendar i Workout badge. 8. Tip-trening ikona+boja mapa kroz kalendar, liste i WhyCard. 9. EmptyState/QueryError ton + ikona u soft krugu. 10. Ikon stroke/veličina standard (h-4/2, h-5/1.75, hero/empty 1.5).

**P2 — ličnost (kad-tad):** 11. Streak tretman + milestone chip. 12. DONE celebration mikro-momenti (pop + upis + ring). 13. `value-swap` tranzicija brojeva + motion tokeni. 14. Coach-voice vodilica primenjena na T3 copy (race-day, fueling, ICS) pre pisanja stringova.

Napomene: A3 (theming) uključuje phase boje u obe palete; A1 (pages) zadržava vlasništvo nad
rasporedom strana — ovaj dokument definiše sistem i ton. Sve je CSS/Tailwind/lucide: bez novih
dependency-ja i bez izmena koda u ovoj fazi.
