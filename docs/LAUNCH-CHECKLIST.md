# Launch checklist (P)

## U kodu (završeno)

- [x] `favicon.ico` (16/32/48), `favicon-32.png`, `icons/icon-180.png` (apple-touch) i `og-image.png` (1200x630), generisani iz `icons/icon.svg`
- [x] Meta/OG/Twitter u `app/index.html` + `title` i `robots` (index,follow); `<html lang="sr">` ostaje dinamički kroz i18n
- [x] `public/robots.txt` i `public/sitemap.xml`
- [x] `app/src/lib/use-page-title.ts` (hook, još nije povezan na strane)
- [x] Email šabloni: `supabase/templates/{confirmation,recovery,magic_link,email_change}.html` + `[auth.email.template.*]` u `supabase/config.toml`

## Korisnički koraci (hostovani projekat)

1. **Email šabloni**
   - Dashboard → Authentication → Email Templates: prekopirati subject i HTML iz `supabase/templates/` za Confirmation, Recovery, Magic Link i Change Email; ili
   - `npx supabase link --project-ref <ref>` pa `npx supabase config push` (traži `SUPABASE_ACCESS_TOKEN` / PAT). Posle push proveriti subject i sadržaj u dashboardu.
2. **Custom SMTP (brendiran pošiljalac)**
   - Resend free (3.000 mejlova/mesec): verifikovati domen, pa Dashboard → Authentication → SMTP Settings (host `smtp.resend.com`, port 465, user `resend`, pass API ključ, sender name `RunCast`, sender email sa domena).
   - `sender_name` se u `config.toml` prihvata samo pod `[auth.email.smtp]` (uz host/port/user/pass/admin_email), ne pod `[auth.email]`, pa se podešava kroz dashboard ili popunjavanjem `[auth.email.smtp]`.
3. **Custom domen (opciono)**
   - Povezati domen na Cloudflare Pages, pa u `app/index.html` zameniti `https://runcast-2ju.pages.dev/` u `og:url`, `og:image` i `twitter:image`, i isto u `public/robots.txt` i `public/sitemap.xml`.
   - Posle promene domena proveriti OG sliku (npr. opengraph.xyz) i da se `og-image.png` servira sa novog domena.
4. **Per-route naslovi**
   - Hook `usePageTitle(key)` postoji; strane ga pozivaju sa postojećim i18n ključem (`usePageTitle('<ns>:<key>')`) kada ih agent za strane bude menjao.
5. **Alt tekst (audit)**
   - Jedina `<img>` u `app/src` je `components/ui/Avatar.tsx` i ima `alt={t('avatar')}`.
   - Dekorativne SVG ikone su `aria-hidden` (provereno).
6. **Lighthouse / QA pred launch**
   - `npm run build` pa `npm run preview`; Lighthouse (Mobile) na `/login`: cilj SEO i Best Practices 90+, proveriti da su `/favicon.ico`, `/og-image.png`, `/robots.txt` i `/sitemap.xml` dostupni.
   - Ručno: naslov i description u izvoru, OG preview, PWA manifest, mejl test za signup i reset lozinke (Gmail + Outlook, svetla i tamna tema).
