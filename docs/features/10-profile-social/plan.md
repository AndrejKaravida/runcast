# F10 — Plan: Profil + social (avatar, javni profil, rang lista)

## Odluka o mestu rang liste: nova ruta `/leaderboard`

- **Preporuka: sopstvena ruta `/leaderboard`** (unutar `TabLayout`, lazy kao ostale), ne sekcija
  na Stats — razlozi: čista empty state logika, deep-link (`/leaderboard`), Stats strana ostaje
  fokusirana na lične brojke i ne dobija drugi izvor podataka; tabovi ostaju 4 (bez 5. taba).
- Ulazi: (1) `SectionHeader` akcija „Rang lista →“ u sekciji „Nedeljni kilometri“ na Stats
  (koristi postojeći `action` prop); (2) mali link „Otvori rang listu“ u Settings „Profil“
  ispod toggle-a. Bez izmena `TabLayout` i bez novih tabova.

## UX — Settings, sekcija „Profil“

- Na vrhu `Profil` kartice: **avatar** — `AvatarUpload` (okrugli preview 64px, `img alt="Avatar"`,
  fallback inicijali), dugme „Promeni avatar“ (skriveni `<input type="file" accept="image/*"
data-testid="avatar-input">`). Izbor fajla → resize + upload odmah (bez „Sačuvaj profil“);
  loading na dugmetu; greška „Otpremanje nije uspelo — hajde ponovo.“
- Ispod `Ime` (postojeći `AppInput` netaknut): **„Javni profil“** kao `SegmentedControl`
  (isti pattern kao „Podsetnici za gorivo“) — opcije „Uključeno“/„Isključeno“, default
  „Isključeno“.
- Objašnjenje ispod (caption): „Ime i avatar se prikazuju na nedeljnoj rang listi. Email se
  nikada ne prikazuje. Avatar je javno dostupan preko linka.“
- Toggle se šalje zajedno sa ostalim poljima na postojeće dugme „Sačuvaj profil“ (nema novog
  dugmeta za čuvanje); `public_profile` ide u isti `ProfilesUpdate`.
- Postojeći E2E selektori netaknuti: labela `Ime` (exact), dugme `Sačuvaj profil`, notice
  „Profil je sačuvan.“, „Generiši novi plan“ itd. Nova labela je „Javni profil“ (bez kolizije).

## UX — `/leaderboard`

- `SectionHeader` „Rang lista“ + caption „Nedelja po nedelju — ko je istrčao najviše.“
- Lista: red = rang, avatar (ili inicijali), `display_name`, `X km · N treninga`; bez grada,
  bez email-a. Pozivalac istaknut (`bg-primary-soft`, badge „Ti“); ako je van top 20, njegov
  red je prikazan na dnu uz vizuelni separator.
- Uporedni tekst ispod liste:
  - javni + ima km: „Ti si #X ove nedelje.“
  - javni + 0 km: „Ove nedelje još nemaš kilometara — istrči prvi.“
  - nije javni: „Uključi javni profil u podešavanjima da vidiš svoj rang.“ + link ka Settings.
- Empty state (nijedan `public_profile` korisnik nema treninge): `EmptyState` —
  „Rang lista je još prazna“ / „Uključi javni profil i budi prvi na listi.“ + link na Settings.
- Loading: `Skeleton`; greška: `QueryError` (postojeći primitivi).

## Copy (srpski, bez emodžija)

- „Promeni avatar“ · „Otpremanje nije uspelo — hajde ponovo.“
- „Javni profil“ · „Uključeno“ / „Isključeno“ · gornja caption rečenica.
- „Rang lista“ · „Otvori rang listu“ · „Ti“ · „Ti si #X ove nedelje.“
- „Rang lista je još prazna“ · „Uključi javni profil i budi prvi na listi.“

## Acceptance criteria

- [ ] Migracija dodaje `profiles.avatar_url`, `profiles.public_profile` (default false),
      `avatars` bucket (public, limit 1 MB, samo JPEG) i 4 storage politike + `weekly_leaderboard`
      RPC sa revoke/grant kao u `architecture.md`.
- [ ] Upload avatar: izbor slike → resize 512px JPEG → `avatars/<uid>/avatar.jpg` (upsert) →
      `avatar_url` sa `?v=` → preview se odmah menja; reload zadržava avatar.
- [ ] Fajl veći od 10 MB ili nije slika → jasna greška, bez upload-a; bucket limit je backstop.
- [ ] `public_profile` default OFF; isključivanje odmah sklanja korisnika sa liste (invalidacija
      `['leaderboard']` posle `['profile']` izmene).
- [ ] `/leaderboard`: top 20 po km u tekućoj ISO nedelji (ponedeljak kao početak, isti dan kao
      `startOfWeekIso`), samo javni profili, `dense_rank` prikaz, deterministički tie-break;
      pozivalac uvek vidi svoj red (i van top 20) ili CTA za opt-in.
- [ ] Na listi se nikad ne prikazuju email, grad, težina, godine — samo ime + avatar (+ km/sesije).
- [ ] Postojeći E2E (app/coach/fueling/guided/ics/predictor/raceday/responsive/theme/why) zeleni;
      nijedan stari selektor nije promenjen.
- [ ] Bez novih depova, bez 5. taba, bez izmena postojećih tabela osim `profiles` kolona.

## Van opsega / otvoreno

- **Pratnja/prijatelji, poređenje 1:1, klubovi, komentari** — F10 je samo rang lista.
- **Anti-cheat ML i outlier pravila** — v1 veruje ručnom unosu (vidi `research.md` §5).
- **Signed URL-ovi za avatare** — svesno odbačeno; javni bucket + napomena korisniku.
- **Javna profil strana drugog korisnika** (`/u/:id`) — nije potrebna za rang listu.
- **Elevation/serije** — metrike v1 su isključivo km + broj treninga.
