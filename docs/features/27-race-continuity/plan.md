# F27 — Kontinuitet trka (oporavak → sledeći cilj)

Cilj: zatvori petlju posle trke — kad je plan oporavka (F20) aktivan a u kalendaru (F23)
postoji buduća trka, ponudi generisanje plana za **sledeći cilj** sa unapred izabranom trkom.

## Trenutno stanje

- F20: kartica oporavka na PlanPage kad je `race_date` prošao; generiše plan bez trke
  (`race_id null`, `weeks = 2`).
- F23: lista trka + izbor ciljne trke pri generisanju (`SettingsPlanPage`, `raceId` put).
- PlanPage prikazuje header/progres aktivnog plana; SettingsPlanPage ima generate formu.

## Implementacija

1. **PlanPage**: kad je aktivni plan oporavak (`race_id null` i `weeks = 2` — postojeća F20
   detekcija) i `useRaces()` ima buduću trku: kartica „Sledeći cilj: {naziv} · {datum} · za X
   dana" + dugme „Generiši plan za ovu trku" → navigacija na `/settings/plan?race=<id>`.
   Ako ima više budućih trka → prikaži najbližu; ostale su u Settings listi.
2. **SettingsPlanPage**: `useSearchParams` — kad postoji `race` param, otvori generate formu
   sa tom trkom izabranom (F23 `raceId` put) i očisti param posle otvaranja (replace navigacija).
3. **i18n** `plan.json` sr/en: `nextGoal.*` (naslov, subtitle, CTA).
4. **E2E** `race-continuity.spec.ts`: onboarding (trka) → REST: `races.race_date` na juče →
   PlanPage oporavak kartica → generiši oporavak → dodaj buduću trku (F23 UI u Settings) →
   PlanPage prikazuje „Sledeći cilj" karticu → klik → generate forma otvorena sa tom trkom →
   generiši → novi plan cilja tu trku (header/race chip).

## Van v1

Auto-prelazak bez klika, blending više trka u jedan plan, periodizacija „trka pa trka" sa
međuciljevima.
