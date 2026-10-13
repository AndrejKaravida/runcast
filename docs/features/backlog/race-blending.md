# Backlog — Blending više trka (periodizacija trka-pa-trka)

Cilj: jedan plan koji vodi kroz više trka (npr. 10K za 6 nedelja → maraton za 5 meseci), sa
međuciljevima, umesto odvojenih planova.

- **Pristup**: generator dobija listu ciljeva; faze se ređaju ka najdaljoj trci, a bliže trke
  postaju „tune-up" nedelje (taper mini + oporavak 3-5 dana). `plans` dobija `race_ids[]` ili
  `plan_races` tabelu; RaceDay/PlanPage prikazuju sledeći međucilj.
- **Preduslovi**: F23 (lista trka) ✅, F20 (oporavak) ✅, F27 (kontinuitet) ✅ — blending je
  njihova generalizacija.
- **Obim**: L (generator + šema + UI + migracije istorije).
- **Zašto odloženo**: F27 pokriva 80% realnog scenarija (jedna trka po planu + prelaz); blending
  donosi vrednost tek kad korisnici masovno vode 2+ trke.
