# F30 — UI audit (margine, padding, konzistentnost)

Cilj: sistematski pregled svih stranica na 390px (i 320px za overflow) i popravka svih
uočenih UI problema — margine, padding, razmaci, preklapanje sa floating dock-om, duplirani
ili nedostajući wrapper-i.

## Poznati nalaz

- **FriendsPage bez margina**: `/friends` je van TabLayout-a (nema `px-4` iz `main`), a koristi
  `SettingsSubpage` koji očekuje padding roditelja → sadržaj nalepljen na ivice. Fix je u F29
  (standalone wrapper kao LeaderboardPage). Ovaj audit NE dira FriendsPage.

## Metod

1. Snimiti sve rute na 390px (i 320px): login, register, forgot/reset, onboarding, today,
   plan, stats, settings + 6 podstranica, workout/:id, run/:id, race-day, benchmark,
   leaderboard, privacy/terms/licenses, not-found.
2. Za svaku proveriti: horizontalni padding (očekivano `px-4`; standalone stranice
   `mx-auto max-w-[560px] px-4 py-6`), vertikalni ritam (`space-y-5/6`), preklapanje sa dock-om
   (`pb` na main-u), overflow na 320px, konzistentnost naslova (back + h1 obrazac), skeleton
   visine.
3. Popraviti sve što odstupa od obrazaca; za probleme u fajlovima koje drže paralelni agenti
   (SettingsPlanPage, FriendsPage, SettingsProfilePage) — samo prijaviti u izveštaju.

## Izlaz

- Popravke + kratak `docs/UI-AUDIT.md` (tabela: ruta | nalaz | status). Bez redizajna —
  isključivo konzistentnost i margine.
