# F23 — Više trka (race calendar)

Cilj: korisnik vodi **listu trka** (npr. 10K za 6 nedelja, maraton za 5 meseci): dodavanje,
izmena (F16 modal), brisanje i izbor trke kao cilja plana pri generisanju/regeneraciji.

## Trenutno stanje

- `races` tabela ima `user_id`; `plans.race_id` FK; lista trka se već čita u `queries.ts:200`
  (`['races']` query postoji, koristi se za... proveriti gde).
- F16: edit trke + regeneracija postoje; onboarding/settings generisanje kreira novu trku.

## Implementacija

1. **Queries**: `useRaces()` (sve korisnikove trke, sortirane po datumu), `useAddRace()`,
   `useDeleteRace()` (blokirano ako je trka vezana za aktivni plan — poruka), `useSetPlanRace()`
   ili kroz regeneraciju (dole). Invalidacije `['races']`, `['plans']`.
2. **UI (SettingsPlanPage)** — nova sekcija „Trke" ispod postojeće ciljne trke:
   - lista trka: naziv, datum, distanca, „za X dana" / „prošla"; oznaka „Cilj plana" na onoj
     koja je vezana za aktivni plan; akcije: Uredi (postojeći modal), Obriši (ConfirmDialog;
     blokirano za plan target sa jasnom porukom).
   - „Dodaj trku" forma (naziv, datum, distanca, ciljno vreme) — reuse `PlanFields` race/goal
     grupe gde je praktično.
   - Generisanje/regeneracija plana: u formi za novi plan dodati izbor „Ciljna trka"
     (AppSelect: postojeće buduće trke + „Nova trka"); izabrana trka se prosleđuje
     `create_plan_with_workouts` kao postojeći race umesto kreiranja nove (proveriti RPC —
     prima li postojeći race_id ili uvek insert; ako uvek insert, koristiti postojeći F16 tok:
     generiši pa poveži/izmeni; najjednostavnije: proslediti race polja iz izabrane trke).
3. **RaceDayPage**: bez izmena u v1 (radi za trku aktivnog plana); ako je prošla a postoji
   buduća trka, PlanPage header prikazuje sledeću trku? — v1: samo lista u Settings.
4. **E2E** `races.spec.ts`: dodaj drugu trku (10K za mesec dana) → lista prikazuje obe →
   uredi novu (F16 modal) → obriši je (uspeh) → pokušaj brisanja ciljne trke (blokirano sa
   porukom) → generiši novi plan sa izabranom budućom trkom → plan header prikazuje tu trku.

## Van v1

Blending više trka u jedan plan (Runna Upcoming Plans), auto-prelazak na sledeću trku posle
završene, kalendar svih trka na PlanPage.
