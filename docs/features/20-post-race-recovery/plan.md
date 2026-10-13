# F20 — Plan oporavka posle trke (2 nedelje)

Cilj: posle dana trke ponudi **plan oporavka (2 nedelje)** — lagane trke + mobilnost, bez
quality rada — da korisnik ostane u aplikaciji i posle cilja.

## Trenutno stanje

- Plan se kreira samo kroz `create_plan_with_workouts` RPC (obavezno sa trkom); generator ima
  faze base/build/peak/taper + strength/mobility (`strength.ts`).
- `RaceDayPage` prikazuje dan trke; posle trke nema nikakvog toka.
- RPC potpis: proveriti da li `race` može biti null; ako ne, dodati mali `create_recovery_plan`
  RPC (isti INSERT pattern, bez races reda) — preferirati reuse ako je moguće.

## Implementacija

1. **Shared `recovery-plan.ts`** (+ testovi): `buildRecoveryPlan({ startDate, runDays })` →
   `WorkoutDraft[]` za 2 nedelje:
   - nedelja 1: 2-3 EASY trke 30-40 min + 1 MOBILITY; bez TEMPO/INTERVALS/REPEAT/LONG
     (LONG samo ako je race bio polumaraton+ → 60 min easy? ne — v1 bez LONG u oporavku).
   - nedelja 2: 2-3 EASY 40-50 min + MOBILITY + opciono 1 REPETITIONS laganih strides (samo
     ako je korisnik iskusan? v1: bez — čist easy + mobilnost).
   - `phase: 'BASE'`, `weekIndex 1-2`; `paceZone 'E'`.
2. **Flow**: kartica na `PlanPage` (i `RaceDayPage` posle trke) vidljiva kad je `race_date`
   prošao a nema aktivnog oporavka: „Čestitamo na trci! Želiš plan oporavka (2 nedelje)?"
   → dugme generiše plan (deaktivira trenutni plan? postojeći generate flow zamenjuje aktivni
   plan — proveriti kako `useGeneratePlan` menja aktivni plan i iskoristiti isti mehanizam).
   Napomena: pre generisanja upozorenje da trenutni (završeni) plan prelazi u istoriju.
3. **E2E** `recovery.spec.ts`: onboarding sa trkom → REST update `races.race_date` na juče
   (obrazac iz reschedule spec) → PlanPage prikazuje karticu → generiši → kalendar prikazuje
   2 nedelje EASY/MOBILITY treninga, bez quality tipova.

## Van v1

Auto-generisanje bez pitanja, oporavak po dužini trke (5K vs maraton različit), povratak na
novi ciljni plan posle oporavka (post-race → novi ciklus).
