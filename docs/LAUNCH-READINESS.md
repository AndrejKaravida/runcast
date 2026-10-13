# Launch readiness — compliance audit

Datum audita: 2026-10-13 · Verzija: v1.6 + launch compliance talas

## Rešeno u kodu (implementirano i testirano)

1. **Politika privatnosti** (`/privacy`, sr/en, 11 sekcija): šta se prikuplja i zašto, pravni
   osnovi, posebna sekcija o zdravstvenim podacima (dobrovoljan uvoz, nikad za reklame, ne deli
   se), obrađivači (Supabase, Cloudflare, Open-Meteo, push servisi), lokalno skladištenje bez
   tracking kolačića, zadržavanje, prava korisnika (pristup, ispravka, brisanje, prenosivost,
   pritužba Povereniku), deca 16+, sekcija „Brisanje naloga" sa anchor-om `#brisanje-naloga`.
2. **Uslovi korišćenja** (`/terms`, sr/en, 11 sekcija): opis usluge, pravila naloga, dozvoljeno
   korišćenje, **zdravstvena i bezbednosna napomena** (nije medicinski savet, konsultuj lekara),
   **napomena o tačnosti vremenske prognoze** (Open-Meteo, bez garancije), intelektualna svojina,
   dostupnost, raskid, ograničenje odgovornosti, pravo Srbije.
3. **Consent pri registraciji**: obavezan checkbox (16+ i prihvatanje Uslova + Politike, bez
   unapred štikliranja), linkovi ka dokumentima; consent se beleži u user metadata
   (`terms_version`, `terms_accepted_at`) + verzija dokumenata u `features/legal/legal.ts`.
4. **Linkovi ka pravnim dokumentima**: login footer, registracija, `/settings/account`.
5. **Health consent**: napomena u „Integracije" pre uvoza (dobrovoljno, podaci ostaju u nalogu,
   link ka Politici privatnosti).
6. **Brisanje naloga** (`/settings/account`): typed confirm („OBRIŠI"), uklanjanje avatara iz
   storage-a, RPC `delete_my_account` (security definer, samo authenticated), svi FK-ovi
   `on delete cascade` (auditirano, bez orphan redova, dokazano na lokalnoj bazi), odjava i
   redirect na login. Zadovoljava App Store 5.1.1(v) i Play data deletion policy.
7. **Izvoz podataka** („Preuzmi moje podatke"): JSON sa svim korisničkim tabelama (pravo na
   pristup i prenosivost).
8. **Licence otvorenog koda** (`/licenses`): generator `npm run licenses:generate` (23 direktne
   produkcione zavisnosti) + Inter (OFL-1.1) + Open-Meteo (CC BY 4.0).
9. **Open-Meteo atribucija** vidljiva u UI uz prikaz vremena (CC BY 4.0 zahtev).
10. **iOS**: `PrivacyInfo.xcprivacy` (required-reason APIs + collected data), uključen u Xcode
    projekat i verifikovan u build bundle-u; `ITSAppUsesNonExemptEncryption=false`.
11. **Android**: `targetSdk 36`, `minSdk 26`, Health Connect permisije deklarisane (već bilo).
12. **Bez analitike i tracking kolačića**: nema cookie bannera (samo localStorage za temu, jezik,
    gorivo, health sync); fontovi self-hosted (Inter preko @fontsource, nema Google Fonts CDN).

Testovi: 269 unit + 59 E2E (consent, account deletion/export, licenses).

## Pre objave (akcije van koda)

1. **Kontakt email i entitet**: zameni placeholdere u `app/src/features/legal/legal.ts`
   (`LEGAL_CONTACT_EMAIL = support@runcast.app`, `LEGAL_ENTITY`) stvarnim podacima.
2. **Custom SMTP u Supabase**: podrazumevani SMTP ne dostavlja mejlove običnim korisnicima
   (samo timski mejlovi, nizak rate limit). Podesi Resend/SES pre objave.
3. **Custom domen**: `runcast-2ju.pages.dev` zameni pravim domenom i ažuriraj URL-ove u store
   listinzima i pravnoj dokumentaciji.
4. **Supabase region**: proveri da je projekat u EU regionu (GDPR transfer).
5. **Backup**: dodaj GitHub secrete `SUPABASE_DB_URL` i `BACKUP_PASSPHRASE` (nedeljni backup
   trenutno tiho ne radi).
6. **Apple Developer** ($99/god) + App Store Connect: privacy labels (Email, Name, Health &
   Fitness, User ID; linked, not tracking), account deletion info, EULA link.
7. **Google Play**: Data Safety form (uključiti zdravstvene podatke), URL za brisanje naloga
   (`https://<domen>/privacy#brisanje-naloga`), health apps declaration, content rating.
8. **Pravna revizija**: preporučeno da advokat pregleda Politiku i Uslove pre objave. Tekstovi
   su kompletni i GDPR-aligned, ali nisu pravni savet.
9. **Repo LICENSE**: odluka (trenutno bez licence = sva prava zadržana).
10. **Cloudflare Web Analytics**: proveri da je isključen (ako se uključi, dodati u Politiku).
11. **Apple nalog za test korisnika**: `test@test.com` je blokiran na Supabase signup validaciji
    (specijalan domen); koristi dashboard „Add user" ili dodaj `SUPABASE_DB_URL` secret.
