# F10 — Istraživanje: Profil + social (avatar, javni profil, rang lista)

## Metod

12 web upita: Supabase Storage free tier i egress, bucket/RLS politike za avatare, upload best
practice i upsert, canvas vs `browser-image-compression`, Strava privatnost i leaderboard
pravila, GDPR data-minimisation u fitness aplikacijama, Strava club leaderboard metrike,
Runna levels/challenges, security definer RPC vs view za agregacije tuđih redova, Postgres
`rank`/`dense_rank`, Strava anti-cheat.

## 1. Supabase Storage — limiti

- Free plan: **1 GB storage**, **5 GB egress + 5 GB cached** (unified bandwidth, deli se sa
  bazom), max fajl 50 MB (globalno), standard upload preporučen do 6 MB. Projekat se pauzira
  posle 7 dana bez saobraćaja.
- Avatar 512px JPEG ≈ 30–65 KB → 1 GB ≈ 15–30k avatara; **egress je pravi limit**: 5 GB
  ≈ 80–150k učitavanja avatara/mesec. Javni bucket ide kroz CDN i cache hit se obračunava kao
  cached egress (jeftiniji/dvostruki budžet).
- Zaključak: za RunCast v1 (mali broj korisnika) free tier je dovoljan; držati slike male.

## 2. Bucket politike za avatare

- Javni bucket (`public = true`) preskače RLS za GET preko javnog URL-a (public read je
  ugrađen); upload/update/delete i dalje traže RLS politike na `storage.objects`.
- Best practice putanja: `<userId>/avatar.jpg` + `(storage.foldername(name))[1] =
auth.uid()::text` u politici; sanitizovati ime, ograničiti `file_size_limit` i
  `allowed_mime_types` na bucket-u; ne pisati u `storage` šemu, samo politike.
- `upsert: true` traži **SELECT + UPDATE** politiku pored INSERT; bez toga drugi upload padne
  sa „Asset Already Exists“. Supabase upozorava da overwrite kasni kroz CDN — mitigacija:
  isti path + `?v=<timestamp>` u URL-u (novi cache ključ).
- Signed URL-ovi nisu potrebni: avatar je namerno javan (matching Strava model); signed URL
  bi komplikovao render liste i istekao.

## 3. Client-side resize

- Canvas varijanta bez depova: `createImageBitmap(file, { imageOrientation: 'from-image' })`
  (rešava EXIF rotaciju) → center-crop na kvadrat → 512×512 → `canvas.toBlob('image/jpeg',
0.85)` ≈ 30–60 KB. ~30 linija.
- `browser-image-compression` (2.0.2, ~1.4M weekly downloads) nudi web-worker i EXIF, ali je
  nov dep; repo pravilo je „bez novih depova ako postoji razumna in-repo alternativa“.
  Crop na kvadrat i fiksna veličina su nam ionako potrebni → **canvas, bez depa**.

## 4. Privatnost (norme)

- Strava: aktivnost mora biti „Everyone“ da bi ušla na javni leaderboard; „Followers“/„Only
  You“ je isključuju. Profil „Everyone“ ili „Followers“. Leaderboard prikazuje ime i sliku.
- GDPR čl. 25 (privacy by default): podrazumevano minimalno izlaganje. Fitness aplikacije
  (npr. GymFit) eksplicitno navode „leaderboard je privatan po defaultu i potpuno opt-in“.
- Za RunCast: `public_profile default false`; rang lista prikazuje **samo `display_name` i
  avatar** (nikad email, grad, težinu); korisnik može da isključi u svakom trenutku i nestaje
  iz liste. Napomena o javnoj čitljivosti avatar fajla ide uz toggle.

## 5. Rang liste u fitness aplikacijama

- Strava klubovi: nedeljna lista po distanci; web top 100, mobilna top 10; metrike distance/
  time/elevation. Mesečni distance challenge je čisto „ko pređe više“.
- Runna: Levels/points (gamifikacija), **nema javnih leaderboard-a** — potvrđuje da je i
  jednostavna nedeljna km lista vredna, bez kompleksnog sistema poena.
- Metrike za v1: **nedeljni km (suma `run_logs.distance_km`) + broj treninga**; distance je
  primarna, sesije su tie-break kontekst.
- Anti-cheat (Strava): ML skenira desetine faktora i auto-flaguje, zajednica prijavljuje.
  Za v1: nema ML-a — opt-in, ručni unos, mali broj korisnika; outlier zaštita = budući rad
  (npr. plafon po jednom logu), ne blokira v1.
- Ties: `dense_rank()` (isti rang bez preskakanja) za prikaz; `row_number()` za tačan rez
  top-20; deterministički tie-break `km desc, display_name, user_id`.

## 6. RLS za agregacije tuđih redova: RPC vs view

- View u Postgresu je po defaultu security definer (bypass RLS) — Supabase linter 0010; može
  slučajno da izloži redove. `security_invoker = true` view poštuje RLS, ali onda `run_logs`
  politika (samo svoji redovi) **onemogućava agregaciju tuđih** — view ne može.
- Security definer funkcija je kontrolisani bypass; Supabase RLS best-practice je eksplicitno
  preporučuje za upite nad tuđim tabelama. Linter 0029 upozorava da je definer funkcija u
  `public` pozivljiva preko `/rest/v1/rpc` — mitigacije koje ćemo primeniti:
  `set search_path = ''` + schema-qualified imena, `revoke` sa `public`/`anon`,
  `grant` samo `authenticated`, fiksiran izlaz (samo whitelistovane kolone, filter
  `public_profile`, `limit 20`, bez parametara koji menjaju obim).
- **Odluka: security definer RPC** `weekly_leaderboard(p_week_start date)`.

## 7. Odluke

1. Javni `avatars` bucket, putanja `<userId>/avatar.jpg`, upsert + `?v=` cache-bust.
2. Canvas resize na 512px JPEG; bez novog depa.
3. Opt-in javni profil (default OFF), na listi samo ime + avatar.
4. Nedeljna rang lista: km + sesije, `dense_rank`, top 20 + red pozivaoca.
5. Agregacija kroz security definer RPC, ne view.

## Izvori

- supabase.com/docs: storage/serving/bandwidth, uploads/file-limits, security/access-control,
  security/ownership, buckets/fundamentals, uploads/standard-uploads, database/postgres/
  row-level-security, database/database-advisors (0010, 0029), RLS best practices
- blog.storage-500gb… (cached egress 5+5 GB); selfhost.dev, costbench.com (free tier 2026)
- support.strava.com: Activity/Profile Privacy Controls, Clubs, Segment Leaderboard
  Guidelines, Excluded Efforts, Report Cheating; techcrunch.com (ML anti-cheat)
- runna.com / support.runna.com (Levels), runifyapp.com (distance ladders), gymfit.app,
  roxfit.app, gdpr.eu art. 25, gdpr-info.eu art. 25
- postgresql.org/docs (window functions), neon.com/docs/functions/dense_rank
- npmjs.com/package/browser-image-compression, cloudinary.com (canvas compress guide)
