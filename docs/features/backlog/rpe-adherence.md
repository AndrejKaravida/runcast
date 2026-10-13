# Backlog — RPE-težinska adherence

Cilj: adherence skor (F24) obogaćen iskrenošću napora — trening sa RPE koji ne odgovara
propisanoj zoni nosi manju težinu od onog koji odgovara.

- **Pristup**: u `adherence_weekly_leaderboard` dodati težinu po sesiji: `w = 1` ako je RPE u
  očekivanom opsegu za tip (npr. EASY ≤ 4, TEMPO 6-8), `w = 0.5` ako odstupa više od 2; skor =
  `100 * sum(w) / prescribed`. Feed/rang lista prikazuju „kvalitetno odrađeno" kao sekundarni
  broj.
- **Preduslovi**: RPE se već beleži (F4); potrebno definisati opsege po tipu u shared modulu.
- **Obim**: S-M (SQL + shared + UI caption).
- **Zašto odloženo**: bez dovoljno podataka po korisniku skor je šum; prvo pustiti osnovni
  adherence da prikupi navike.
