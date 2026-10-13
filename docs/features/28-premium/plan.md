# F28 — Premium arhitektura (označavanje i zaključavanje feature-a)

Cilj: svaki feature može da se označi kao premium **bez refaktora** — jedan registar, jedna
gate komponenta, jedno mesto za proveru. Uplate ne postoje u ovoj fazi: premium se dodeljuje
ručno (DB flag), zaključan UI prikazuje „Premium" + „stiže uskoro". Prvi premium feature:
**više trka** (F23).

## Podaci (već primenjeno)

- `profiles.premium boolean not null default false`, `profiles.premium_since timestamptz`
  (migracija `20261013200914_profiles_premium`). Dodela: ručno (SQL/dashboard) dok ne dođu
  uplate; `premium_since` za buduću istoriju/grace period.

## App arhitektura

1. **`app/src/features/premium/registry.ts`**: jedini izvor istine —
   ```ts
   export const PREMIUM_FEATURES = {
     multiple_races: { labelKey: 'premium:features.multipleRaces' },
   } as const;
   export type PremiumFeature = keyof typeof PREMIUM_FEATURES;
   ```
   Novi feature = novi red u registru + gate na mestu korišćenja. Ništa drugo.
2. **`features/premium/queries.ts`**: `usePremium()` → `{ isPremium, premiumSince }` iz
   postojećeg `useProfile` (bez novog poziva); `isPremium === false` dok se profil ne učita
   (fail-closed za premium sadržaj, fail-open za običan).
3. **`components/premium/PremiumLock.tsx`**: kartica sa lock ikonom, naslovom feature-a iz
   registra, opisom, „Premium" badge-om i CTA „Saznaj više" → `PremiumDialog` (modal,
   „Premium stiže uskoro, ostani sa nama"). Opciono `children` za blur/overlay preko preview-a
   sadržaja; v1: plain kartica (bez blura).
4. **`components/premium/PremiumBadge.tsx`**: mala pilula „Premium" za redove/labele (npr. u
   listi trka, buduće u menijima).
5. **Primena (sada) — više trka**:
   - `SettingsPlanPage` sekcija „Trke": premium korisnik vidi punu F23 listu; free vidi
     `PremiumLock feature="multiple_races"` na mestu liste (ciljna trka iznad ostaje vidljiva
     i njen Uredi ostaje besplatan — F16).
   - Generate forma: „Ciljna trka" select se prikazuje samo premium korisnicima; free koristi
     postojeći tok (nova trka iz forme).
   - „Dodaj trku" i „Postavi kao cilj" su unutar premium sekcije (time automatski premium).
6. **Promena aktivne trke (cilja plana)** — deo premium toka: na svakom redu buduće trke u
   listi akcija „Postavi kao cilj" → `useSetPlanRace()` (update `plans.race_id`, invalidacija
   `['plans']`, `['plan']`); posle uspeha notice „Cilj plana je promenjen." + ponuda
   „Regeneriši plan za ovu trku" (postojeći F23 `raceId` generate tok). Bez auto-regeneracije.
7. **i18n**: nova namespace `premium.json` (sr/en): `features.multipleRaces`, `lockedTitle`,
   `lockedText`, `badge`, `dialogTitle`, `dialogText`, `dialogCta`, `goalSwitched`,
   `regenerateOffer`.
8. **E2E**: `premium.spec.ts` — free korisnik: sekcija Trke zaključana + dialog radi; preko
   Node supabase klijenta `profiles.premium = true` → reload → puna lista; „Postavi kao cilj"
   menja cilj (race chip na Danas). `races.spec.ts` + `race-continuity.spec.ts`: pre UI dela
   testa postaviti `premium = true` (REST) jer koriste F23 tok.

## Pravila i budućnost

- **Server-side enforcement dolazi uz uplate** (RLS/RPC provere po `profiles.premium`); sada je
  gate isključivo klijentski i to je dokumentovana svesna odluka za fazu bez naplate.
- Kad dođu uplate: `premium_until` + grace period + receipt validacija preko RevenueCat/Stripe
  (vidi `docs/features/backlog/pricing.md`); registar ostaje isti.
- Export/brisanje naloga: `premium`/`premium_since`/`username` idu u export automatski (profiles
  red); ništa dodatno.
