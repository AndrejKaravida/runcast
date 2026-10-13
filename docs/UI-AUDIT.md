# F30 - UI audit: nalazi i popravke

Audit svih ruta na 390x844 uz spot-proveru 320px. Nema horizontalnog overflow-a ni na jednoj
proverenoj ruti (potvrđeno i merenjem `scrollWidth`).

| Ruta                         | Nalaz                                                                                                                  | Status                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| /today                       | Korenski ritam `space-y-4`, dok Plan/Stats/Settings koriste `space-y-5/6`; skeleton je pratio isti ritam               | Popravljeno: `TodayPage` i `TodaySkeleton` na `space-y-5` (`TodayPage.tsx`)                      |
| /leaderboard                 | Nedostaje naslov po obrascu `back + h1`; naslov je bio samo mali `section-label` iz `SectionHeader`                    | Popravljeno: `h1 text-2xl` sa linkom Prijatelji u istom redu (`LeaderboardPage.tsx`)             |
| /privacy, /terms             | Standalone omotač koristio `py-8` umesto `py-6` obrasca                                                                | Popravljeno: `LegalPage.tsx` na `py-6`                                                           |
| /friends                     | Bez `mx-auto max-w-[560px] px-4` omotača, sadržaj nalepljen na ivice                                                   | U toku (F29): paralelni agent je u međuvremenu dodao omotač (`FriendsPage.tsx:82`, h1 levo 16px) |
| /onboarding (korak 2, 320px) | VDOT pregled: EASY tempo se skraćuje (`6:51-5:4...`) zbog `truncate` u `StatRow`; nema overflow-a, ali se gubi sadržaj | Popravljeno: `StatRow` dobio `compact` (text-base) + upotreba u VDOT pregledu                    |
| /workout/:id (320px)         | Akcije u zaglavlju se prelamaju u drugi red pored Nazad dugmeta; nema overflow-a                                       | Prihvaćeno ponašanje: `flex-wrap` je namerni graceful wrap na 320px                              |

Bez nalaza: /login, /register, /forgot-password, /reset-password, /licenses, /not-found, /plan,
/stats, /settings i svih 6 podstranica (profil, plan, notifikacije, zdravlje, oprema, nalog),
/run/:id (pregled), /race-day, /benchmark. Nalazi na /today, /leaderboard, /privacy i /terms su
popravljeni. /friends je izuzet i pokriva ga F29.

Svi standalone pregledi prate `mx-auto w-full max-w-[560px] px-4 py-6`, TabLayout strane se
oslanjaju na `px-4` iz `main`-a, a floating dock ne preklapa sadržaj (`pb` 104px na `main`-u).
