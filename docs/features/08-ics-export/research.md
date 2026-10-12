# F8 (R3) — Istraživanje: Kalendar sync (ICS izvoz)

## Metod

9 web upita: RFC 5545 (content lines/folding, TEXT escaping, DATE-TIME/TZID/VTIMEZONE, UID/DTSTAMP),
praktični ICS vodiči (dev.to, JSR `ics-core`), Google „add event" link parametri, Runna support
(calendar sync) + Runsei/TrainingPeaks/CalConnect (fajl vs webcal subscription).

## RFC 5545 — šta generator mora da poštuje

- Envelope: `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID` su obavezni; svaki događaj je
  `BEGIN:VEVENT` … `END:VEVENT`; `END:VCALENDAR` na kraju.
- Content lines: razdvojene CRLF; SHOULD ne duže od **75 okteta** (ne karaktera). Folding:
  CRLF + jedan space; nastavak sme 74 okteta jer vodeći space ulazi u budžet. Nikad ne lomiti
  usred UTF-8 multibajt sekvence („Č", „ž" = 2 bajta) — fold po code point granici.
- TEXT escaping (§3.3.11) samo u `SUMMARY`/`DESCRIPTION`: `\` → `\\`, `;` → `\;`, `,` → `\,`,
  novi red (LF/CR/CRLF) → literal `\n`. Redosled: normalizuj nove redove → backslash prvi →
  `;` i `,` → novi red; obrnut redosled duplo escape-uje (klasičan bug).
- `UID` je obavezan i globalno jedinstven; stabilan UID (`workout-<id>@runcast.app`) čini
  ponovni import ažuriranjem istih događaja umesto duplikata.
- `DTSTAMP` je obavezan, u UTC (`…Z`) i predstavlja trenutak generisanja fajla, ne start događaja.
- `DTSTART` obavezan; `DTEND` je ne-uključiv (end = start + trajanje), alternativa je `DURATION`.
  Za DATE vrednosti `DTEND` je sledeći dan (all-day konvencija).
- `DTSTART` DATE-TIME bez `Z` i bez `TZID` = **floating** lokalno vreme; `TZID` zahteva
  odgovarajući `VTIMEZONE` sa `DAYLIGHT`/`STANDARD` DST pravilima; `TZID` se ne sme stavljati
  na DATE ni UTC vrednosti.
- Escape pre foldovanja; 75 okteta se meri na UTF-8 bajtovima cele content line
  (uključujući ime propertija i `:`).

## Format Google „Add to calendar" linka

- Bazni URL: `https://calendar.google.com/calendar/render?action=TEMPLATE` + `text`, `dates`,
  `details` (opciono `location`, `ctz`/`stz`/`etz`, `recur`).
- `dates=START/END` u `YYYYMMDDTHHMMSS`: bez `Z` = zona gledaoca; sa `Z` = UTC;
  `ctz=<IANA>` je override; all-day `YYYYMMDD/YYYYMMDD` gde je end ekskluzivan (jednodnevni
  all-day → end je sledeći dan).
- Svi parametri URL-encoded (`URLSearchParams` je dovoljan); `details` prihvata HTML ali je
  običan tekst dovoljan.
- Link samo otvara prefilled editor — korisnik mora da klikne Save; bez prijave vodi na login.

## Kako to rade trening aplikacije

- **Runna**: cloud iCalendar feed — „Your Runna workouts sync to your calendar automatically“;
  korisnik se subscribuje (Apple/Google/Outlook/other) i feed se sam osvežava; sync pokriva
  „upcoming workouts and completed activities“, rest dani se ne pominju.
- **Runsei**: privatni subscription link (iCal feed), ažurira se sa planom, link može da se resetuje.
- **TrainingPeaks**: `.ics` export (premium) za Outlook/Google.
- **CalConnect**: static `.ics` = snapshot (jednokratni import); subscription = polling; za
  privatne feedove token u URL-u.

## Odluka: floating lokalna vremena (bez TZID / VTIMEZONE)

- Profil ne čuva vremensku zonu (samo grad/lat/lon), a `run_window` znači „ujutru/uveče po
  mom lokalnom vremenu"; `VTIMEZONE` bi zahtevao DST pravila i odluku koju zonu upisati —
  nepotrebna kompleksnost i rizik da sat sklizne.
- `DTSTART:20261020T070000` (floating) prikazuje se kao 07:00 u zoni u kojoj se kalendar
  koristi — tačno semantika „trčim u 7 ujutru gde god da sam". RFC floating dozvoljava
  „where that is the reasonable behavior".
- Isto pravilo za Google link: `dates` bez `Z` i bez `ctz` → Google koristi zonu gledaoca.
- Svi događaji su timed (run_window daje sat); all-day se ne koristi jer svaki trening ima
  nameravano doba dana. REST dani se ne izvoze (nema aktivnosti koju treba blokirati).
- Ograničenje (prihvaćeno): korisnik u drugoj zoni dobija 07:00 po svojoj lokalnoj zoni,
  ne po Beogradu — namerno, jer je trening vezan za lokalno jutro.

## Izvori

- RFC 5545: datatracker.ietf.org/doc/html/rfc5545 (§3.1, §3.3.11, §3.2.19, §3.3.5, §3.8.4.7, §3.8.7.2)
- icalendar.org: 3-3-5-date-time, 3-2-19-time-zone-identifier (floating vs TZID vs UTC)
- github.com/InteractionDesignFoundation/add-event-to-calendar-docs (services/google.md)
- usecarly.com blog „How to Create an Add to Google Calendar Link“; maxkohler.com/posts/calendar-links
- support.runna.com — syncing-runna-to-your-calendar-scheduling-your-workouts; runsei.com/docs/calendar-sync
- help.trainingpeaks.com — Sync your calendar (.ics); devguide.calconnect.org/publishing
- dev.to (2 članka o RFC 5545 generatoru); jsr.io/@spy4x/time `ics-core` (octet folding, UTF-8 granice)
