# Backlog — monitoring grešaka

Cilj: videti greške u produkciji pre korisnika i imati trag za reprodukciju.

- **Preporuka**: Sentry (hosted, EU region) ili GlitchTip (self-hosted, Sentry-kompatibilan SDK i API).
  GlitchTip je jeftiniji za self-host ali nosi operativni trošak (Docker + baza); Sentry free tier
  (5k grešaka/mes) pokriva start. Odluka tek posle prvih realnih korisnika.
- **Obim integracije**:
  - klijent (Vite SPA): `@sentry/react`, DSN kroz `VITE_*` env; source maps se upload-uju u CI
    koraku za build; release se vezuje za commit SHA.
  - edge funkcija (`send-reminders`, Deno): `@sentry/deno` uz `withSentry` wrapper; DSN kroz
    `supabase secrets`.
- **PII**: `sendDefaultPii = false`, `beforeSend` scrub (email, ime, username, lat/lon, health
  payload, URL bez query stringova), bez IP adrese i bez session replay-a. Politika privatnosti
  trenutno tvrdi da nema analitike i tracking kolačića, pa monitoring ostaje samo za greške.
- **Alarmi**: nova grupa grešaka, skok stope grešaka (npr. > 1% sesija), neuspeh edge funkcije,
  neuspeh auth toka; bez alarmiranja na pojedinačne greške mreže.
- **Preduslovi**: nalog i projekat (EU region zbog GDPR), DSN secreti u Cloudflare Pages i Supabase,
  odluka o retenciji podataka, unos u Politiku privatnosti ako se prikuplja bilo šta van grešaka.
- **Zašto odloženo**: pre objave nema realnih korisnika, a postojeći `ErrorScreen`, retry tokovi i
  lokalni logovi pokrivaju razvoj; ad-blockeri odbijaju deo web zahteva pa je korist na startu mala.
  Preduslov za ozbiljniji monitoring je i custom domen (CSP i dozvole za ingest endpoint).
