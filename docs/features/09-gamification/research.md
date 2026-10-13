# F9 (R3) — Istraživanje: Gamifikacija (dostignuća i nedeljni izazov)

## Metod

12 web upita: Strava (trophy case, segmenti, sistemska mapa), Nike Run Club (bedževi,
challenges, benchmark runs), Runna (Runna Levels, streak/adherence mehanike), Garmin Connect
(badge sistem, dizajn proces, challenges), Duolingo (streak psihologija, streak freeze,
loss aversion + nezavisne studije), dark patterns u fitness gamifikaciji, badge taxonomy
(badge design framework, rarity tiers), slavljenje milestona bez šuma (toast UX),
motivacija trkača (SDT/IMI), randomizovani gamification eksperimenti.

## Kako to rade veliki (Strava / NRC / Runna / Garmin)

- Strava: jedan zapis hrani sve mehanike (streak, trofeji, PR, izazovi, segmenti). Trophy case
  je hronološki; pragovi 1., 3., 5., 10. aktivnost pa do 1.000 — prvi trofej dolazi odmah posle
  prve aktivnosti. PR se meri protiv sopstvene istorije; streak se broji u **nedeljama**, ne
  danima. Izazovi imaju jasan uslov + fiksni prozor (mesec) i digitalni trofej na kraju.
- NRC: bedževi su uglavnom duracija/mile + „potpisni" (rođendan, praznik, nizovi dana);
  Benchmark Run je namerna test-sesija; challenge-i nedeljni/mesečni (3 mi, 9 mi, 100K) + DIY
  challenge sa prijateljima. Slavljenje = „virtual high five" na PR/niz, ne konfete.
- Runna: Runna Levels — poeni za završen plan (+100), snagu (+50), PB; leveli Bronze→Champion;
  bedževi/recognition na profilu; inaktivnost 6 meseci spušta nivo; poeni su ograničeni
  (max 2 planirana trčanja/dan, snaga 1×/nedeljno) da se ne farmuju. Glavni adherence loop je
  „zeleni kalendar" + streak; sync greške koje obore streak su najčešća korisnička zamerka.
- Garmin: 100+ bedževa, 1–8 poena po težini, leveli 1–10; podela one-time / repeatable /
  limited-time; serije (10K → HM → M) drže lovce u igri; instant award je bio eksplicitni cilj
  (bez noćnog batch-a); feature-learning bedževi vode kroz nove funkcije; retki (Zombie) prave
  viralnost. Kritika: previše bedževa → zid sivih zaključanih pločica.

## Duolingo: šta je dokazano, a šta mit

- Loss aversion se „pali" tek posle ~7 dana; najveći ROI je 0→7 (svaki dan drastično diže
  buduće zadržavanje). Streak mora da meri jedinicu koju korisnik razume i prirodno prati.
- Streak freeze (slack) je najbolje potkrepljen deo sistema: fleksibilnost bez resetovanja;
  2 freeze-a > 1, ali 3 nije bolje od 2 (uči korisnike da odmaraju). Nezavisne studije:
  intact streak diže angažovanost, a **prikazan prekinut streak** smanjuje povratak
  (45% vs 61% u jednoj studiji) — vidljiva nula je demotivator. Zaključak: prikazivati
  akumulirano/najbolje, ne nulu; oprostiti propust.
- Monetizacija straha (streak → paywall, „izgubićeš niz" notifikacije) je dark pattern koji
  treba izbeći; RunCast nema plaćanja gamifikacije, pa je rizik mali ali svestan.

## Badge taxonomy i dizajn (best practices)

- 5–7 kategorija/familija razumljivih korisniku, ne 30 pločica; bedž vezan za stvarno
  ponašanje („završi X"), ne apstraktni „level 1". Prag mora imati smisao u jedinici koju
  korisnik već prati (treninzi, km, nedelje).
- Ladder/serije: kad je 10K osvojen, prikazati sledeći prag (HM) — prirodno povlači dalje.
  Nagrade su **trajne** (one-time/repeatable); limited-time kampanje prave „arheologiju".
- Vidljivo-zaključano + hint je bolje od skrivenog (motiviše); skriveno samo za izuzetke.
- Rarity tiers moraju biti vizuelno čitljivi i konzistentni; 3–5 nivoa je dovoljno.
- Anti-pattern: zid od 40 sivih pločica sa 2 osvojena — prikazati familiju sa progresom
  („još X do praga"), ne sve instance odjednom.

## Motivacija trkača (šta zaista radi)

- SDT: kompetencija, autonomija, povezanost. Bedževi i grafovi progresa podižu kompetenciju;
  challenges daju jasan cilj i osećaj izbora; acknowledgement je među najjačim unutrašnjim
  motivatorima u kvalitativnoj studiji sa 15 rekreativaca (ar5iv 2206.09613).
- Randomizovani eksperimenti: gamifikacija diže ponašanje (korake) čak i kad ne diže
  samoprocenjenu motivaciju — efekat je bihevioralni; „hybrid" dizajn (self-challenge +
  podrška) je najbolji. Ekstrinzične nagrade mogu **crowd-in** unutrašnju motivaciju kad su
  informativne i vezane za stvarni napredak (Frontiers 2023).
- Za rekreativce je lični napredak (PB, najduži trk, nedeljna doslednost) > poređenje sa
  drugima; RunCast nema društvene funkcije → self-challenge je pravi izbor za v1.

## Šta izbegavati (dark patterns)

- Streak koji se resetuje na 0 i vidljivo kažnjava propust; leaderboardi sa nepoznatima;
  notifikacije tipa „izgubićeš niz" (loss-framing je A/B-ovan jer diže tapove — anxiety kao
  mehanika); variable-ratio rewards / kazino loop; skrivanje cene iza reward loop-a.
- Posledice iz izveštaja: „streak guilt" → panic-logging lažnih treninga i tihi odlazak posle
  prvog propusta. Etičan pristup: grace/soft streak, „roll forward, don't reset", nikad kazna.
- Za RunCast: nema push notifikacija, nema kazni, nema resetovanja; dostignuća su trajna i
  propust samo pomera progres.

## Slavljenje bez šuma (UX)

- Toast/banner je kanon za tranzijentno slavljenje: `role="status"` (polite), 4–10 s, pauza
  na hover/focus, dismiss; nikad ne blokira; ne stavljati akciju koja se ne sme propustiti.
- Slide+fade 200–300 ms, ease-out; pod `prefers-reduced-motion` instant bez animacije.
- Bez konfeta/glow kao podrazumevanog slavlja; jedan „earned" mikro-moment po događaju,
  < 1 s, nikad ne odlaže sadržaj. Ista proslava na 100. ponavljanju postaje wallpaper.
- Više otključanih nivoa odjednom: prikazati jedan (najjači), ostale tiho markirati.

## Implikacije za RunCast v1

- 9 familija / 20 nivoa sa pragovima iz brief-a; grid po familijama sa progresom (bez zida).
- Self-challenge iz plana (nema drugih korisnika → nema leaderboarda).
- Toast posle zapisivanja treninga + tihi nedeljni red na Today; localStorage samo „seen".
- Trajna dostignuća, bez resetovanja; jedno diskretno slavlje, reduced-motion safe.

## Izvori

- support.strava.com (trophy case, segments); gamification.gamebizconsulting.com (Strava mapa/case)
- nike.com/help (NRC challenges), nike.com/nrc-app, makeuseof.com i techjunkie.com (NRC vodiči)
- support.runna.com (Runna Levels, consistency), sgx.studio/product-intelligence/report-runna
- qnoltkamper.com/connect-badges.html, medium.com/@pancakefeed (Garmin badges/challenges),
  garmin.com blog (25 badges)
- blog.duolingo.com (streak habit-building), duolingo.com/help (streak freeze),
  batlab.substack.com (600 eksperimenata), hosdocumentary.com (nezavisni pregled),
  zenodo.org/records/11528881 (UGT/prospect theory)
- pmc.ncbi.nlm.nih.gov PMC6348030 (gamification u health apps), theawarenessproject.in
  (dark patterns), getfit.news (ethical gamification), lagerland-apps.github.io (streak guilt)
- bricqs.co/guides (badge sistemi), games.jmir.org/2019/2/e14342 (badge design framework),
  ui-patterns.com (collectible achievements), er.educause.edu (badge taxonomy)
- nngroup.com/articles/animation-duration, uianatomy.dev/components/toast,
  thehangline.com (toast best practices)
- ar5iv.labs.arxiv.org/html/2206.09613 (motivacija trkača), sciencedirect S1071581923002148
  (field experiment), frontiersin.org 10.3389/fpsyg.2023.1286463 (motivation crowding)
