# F17 — Social MVP: prijatelji, feed, kudos, friends rang lista

Cilj: umrežavanje korisnika RunCast-a — zahtevi za prijateljstvo, zajednički feed treninga,
kudos, i rang lista samo među prijateljima. Bez contact importa i pretrage po email-u (GDPR
rizik: email friend-finderi proglašeni nezakonitim bez pristanka primaoca).

## Model (mutual friendship, ne follow)

- `friendships(id, requester_id, addressee_id, status 'pending'|'accepted', created_at,
responded_at)`; UNIQUE nad `(least(requester_id, addressee_id), greatest(...))` blokira
  duple parove u oba smera. Oba FK `on delete cascade`.
- `blocks(blocker_id, blocked_id, created_at)` PK par; blok skriva iz liste/feed-a/rang liste
  i onemogućava nove zahteve u oba smera; blokiranom se ne saopštava.
- `kudos(run_log_id, user_id, created_at)` PK par (idempotentno), cascade.
- Bez feed tabele: fan-out-on-read nad `run_logs` (mala baza); indeks `run_logs(user_id,
log_date desc)`.

## RLS (skica)

- friendships: SELECT/UPDATE samo gde je uid u paru; INSERT `requester_id = auth.uid()` i
  `status='pending'`; accept samo addressee.
- blocks: vidi/upravlja samo svoja strana.
- kudos: INSERT `user_id = auth.uid()` + prijatelj/self check; SELECT vezan za vidljiv log.
- run_logs SELECT proširiti: svoj ILI `exists` prihvaćeno prijateljstvo (mutual = pristanak).

## Flow i UI

1. **Pretraga**: samo po tačnom `display_name` (case-insensitive), nikad email/telefon.
   Rate limit ~20 zahteva/dan, max ~100 pending, jedan otvoren zahtev po paru. Odbijanje
   tiho (bez notifikacije).
2. **`/friends` stranica** (unutar TabLayout, ulaz sa rang liste): zahtevi (prihvati/odbij),
   pretraga + dodavanje, lista prijatelja (avatar, ime, nedeljni km, ukloni/blokiraj).
   Pri prihvatanju/prikazivanju jasna napomena: „Prijatelji vide tvoje treninge."
3. **Rang lista** (`LeaderboardPage`): segmented „Globalno" / „Prijatelji" (isti weekly
   agregat, friends predikat) / „Feed". Friends-only rang lista NE zahteva `public_profile`
   (mutual pristanak je osnov).
4. **Feed**: reverse-chron kartice prijateljskih trčanja (distanca, trajanje, pace, ime,
   avatar, kudos dugme + broj). Bez komentara. Prazna stanja jasna.
5. **Notifikacije**: default ON samo za „zahtev primljen/prihvaćen"; „prijatelj je trčao" i
   kudos batched (≤1/dan po prijatelju), default OFF.
6. **Privatnost**: bez `public_profile` ne izlaziš u globalnu listu (postojeće); prijateljima
   si vidljiv kad prihvatiš prijateljstvo. Politika privatnosti: nova sekcija „Prijatelji i
   feed" (ko vidi šta, kako ukloniti prijatelja/blokirati, kaskadno brisanje).
7. **Export/brisanje**: `exportAccountData` uključuje friendships/kudos/blocks; brisanje
   naloga kaskadno čisti sve.

## Van v1

Komentari, DM, klubovi, izazovi, segmenti, asimetrični follow, contact import, javni feed,
prisustvo, report/moderation osim bloka.

## E2E

`social.spec.ts`: dva korisnika (dva browser context-a): A traži B po imenu → B prihvata →
friends rang lista prikazuje oba → A zabeleži trening → B vidi u feed-u i da kudos (broj se
poveća, ponovni klik ne duplira) → B blokira A → A nestaje iz feed-a/liste.
