# F2 — Snaga & mobilnost u planu: istraživanje (Runna-inspired)

## Šta Runna radi

- **Frekvencija**: korisnik bira 1–4 treninga nedeljno; „2 je sweet spot” za većinu. „Running focus” raspored: 1× = Legs & Core, 2× = Full Body + Legs & Core, 3× = Full Body + 2× Legs & Core, 4× = + Upper Body. „Higher-volume runners often need fewer, shorter strength sessions.”
- **Dužina**: u app-u 30/45/60 min (korisnik bira); runnerski sadržaj 20–30 min; 30 min je efektivno za održavanje snage u trkačkoj fazi.
- **Smještaj**: Lower body → easy/rest dani, dalje od ključnih treninga (intervali, long run). Upper body sme bliže teškim danima. Zlatno pravilo: **nikad teška noga dan pre ključnog treninga**; cilj 2–3 dana oporavka između leg day i long run/speed; DOMS pik 24–48 h. „Hard days hard, easy days easy”. Ako se spoji s trčanjem, snaga ide **pre** trčanja (6 h razmak) zbog interference efekta; preporučeni double day je easy run.
- **Faze**: Base = temelji (stabilnost, funkcionalna snaga, bodyweight/forma); Build = snaga/power, balans, unilateralno, plyo (jump squats, hops, box jumps); Peak = smanjen volumen i intenzitet S&C; prepušta prostor sport-specifičnom radu.
- **Taper**: 2 nedelje pre trke ukloniti sve teške liftove (squats, deadlifts, hip thrusts); core/bodyweight smeju da ostanu; ništa novo (DOMS rizik). Zadnjih 5–7 dana bez teretane; race week: dani 6–5 pre trke kratko 25–30 min aktivacija+mobilnost, dani 4–3 samo mobilnost, posle toga ništa; ako je bilo 2×/ned, u prvoj polovini taper nedelje 1× pa 0.
- **Kategorije vježbi**: Legs (čučnjevi, iskoraci, step-up), glutes (single-leg deadlift, glute bridge, hip abdukcija), core (plank, dead bug, bird dog, ruski twist, leg raises), plyo (pogo, box jump, knee drive), mobility/Stretch & Stability, Pilates (progresivni serijal). Preporuka „pola sata” videa: 20 min legs, 20 min core, 30 min stretching/mobility.
- **Prezentacija**: demo video + in-app cue po vježbi; sets×reps + pauza (npr. 3×10, 60 s rest; core circuit 40 s rad / 20 s pauza); težina 85–95% max za zadate repse (1–2 RIR), forma prije težine.
- **Beginner vs advanced**: izbor strength ability (Beginner/Intermediate/Advanced); početnik = bodyweight, osnovni pokreti, forma prvo, bez plyo; napredni = složeni pokreti, unilateralno, progressive overload kroz nedelje.
- **Odnos prema trkačkom planu**: Runna eksplicitno piše: „Your running sessions stay unchanged. Strength sessions sit outside the adaptive running plans. This means they won't influence adherence, intensity guidance, or plan adaptations.”

## Šta kopiramo

- 2×/ned podrazumevano, legs+core fokus; skaliranje po fazi: BASE 2×, BUILD 2×, PEAK 2× lakše, TAPER 1× mobilnost, race week 0.
- Snaga isključivo na **REST danima** (ne diramo trčanje ni dane trčanja; ne pravimo double days).
- Zabrana teških nogu dan pre long run/a; kandidati su samo preostali REST dani.
- Trajanje 20–35 min (kraće od Runna 30–60 jer nemamo video biblioteku i korisnik ne bira dužinu).
- sets×reps u `label` koraku (npr. „Čučnjevi — 3×12”), `durationSec` po koraku; bez videa.
- Početnik: bodyweight, bez plyo; iskusan: unilateralno + plyo od BUILD faze; progressive overload kroz setove/reps po nedelji faze.
- Taper pravila 1:1 (bez teških liftova, kratka mobilnost, ništa u zadnjih 5 dana).
- Snaga ne ulazi u trkačku realizaciju/adherence (naš `weekProgress`/`adherencePct` već filtriraju run tipove).

## Šta izbegavamo

- User preferences (broj sesija, dužina, oprema, all-round/upper split) — v1 nema UI; fiksni default.
- Video biblioteka, guided strength player (F1 pokriva samo trčanje).
- Double day (snaga + trčanje isti dan) i bilo kakvo pomeranje trčanja zbog snage.
- Novi pokreti u taperu; plyo za `experience: 'first'`; težine/oprema (bodyweight-only labeli).
- Strength u stats/finansije/kalendar legende osim jedne nove tačke „Snaga”.

## Izvori

- Runna: izbor cilja i frekvencije — https://support.runna.com/en/articles/8216254-choosing-your-strength-goal-and-training-frequency
- Runna: sve o strength treningu (frekvencija, oprema, težina) — https://support.runna.com/en/articles/6262149-everything-you-need-to-know-about-strength-training-for-runners
- Runna: dodavanje snage u plan (dužine 30/45/60, ability, „running sessions stay unchanged”) — https://support.runna.com/en/articles/15624879-adding-strength-training-to-your-runna-plan
- Runna: kada raditi strength (interference, isti dan, easy run) — https://support.runna.com/en/articles/6830469-when-to-complete-your-strength-sessions
- Runna: balans snage i trčanja (zlatno pravilo, 2×/ned, primer nedelje) — https://www.runna.com/blog/how-to-balance-running-and-strength-training
- Runna: strength landing (legs/core/full body, mobilnost, progresija, 85–95%) — https://www.runna.com/en-gb/training/strength-training
- Runna: taper snage pred trku (bez teških liftova 2 ned, zadnjih 5 dana 0) — https://support.runna.com/en/articles/9813914-how-to-adujst-your-strength-training-ahead-of-your-race
- Runna: gym u race week (25–30 min aktivacija, mobilnost, −40–50% težine) — https://www.runna.com/blog/should-you-do-gym-work-during-taper-week
- Runna: Stretch & Stability / Pilates serijali — https://support.runna.com/en/articles/6169436-stretching-and-pilates-routines-for-runners
- Runna: plyometrics (u plan ugrađeni skokovi) — https://support.runna.com/en/articles/8116495-a-guide-to-plyometrics-for-runners
- Nike Run Club: planovi ubacuju povremeni NTC strength rad, bez strukturisanih sets×reps/placement logike — https://www.nike.com/nrc-app (slabiji benchmark)
- Garmin Coach: standalone strength planovi, nisu placement-aware u odnosu na trčanje — https://www.garmin.com/en-US/garmin-coach/strength
- S&C po fazama (prep/base/build/peak) — https://www.myprocoach.net/wp-content/uploads/SC-Running.pdf
- The Running Channel: 15–30 min, compound + unilateral + core + plyo, posle trčanja — https://therunningchannel.com/strength-training-runners
