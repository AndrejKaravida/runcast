# Design plan — Apple-style fluid interface (RunCast web)

Jedan plan za implementaciju dizajna po Apple principima fluidnih interfejsa (WWDC „Designing Fluid
Interfaces" + materijali/tipografija/pristupačnost). Status: šta je već primenjeno i šta je sledeće.

## 1. Principi → konkretne odluke u RunCast-u

| Princip                   | Odluka                                                                                                                 | Gde                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Response (bez latencije)  | Press feedback na **pointer-down** (`whileTap` u Motion-u), ne na release                                              | `AppButton`, `IconButton`, `WeekStrip`, `SegmentedControl`, tabovi   |
| Direct manipulation (1:1) | Log sheet se vuče prstom 1:1 za ručku; sadržaj i dalje skroluje                                                        | `AppModal` (drag handle, `dragListener={false}` + `useDragControls`) |
| Interruptibility          | Svaki potez se može prekinuti i preusmeriti — Motion springovi animiraju iz trenutne vrednosti, ne iz cilja            | svi Motion elementi                                                  |
| Springs, ne duration      | `{ type: 'spring', bounce: 0, duration }` — kritično dampirano (damping ≈ 1.0) svuda; bounce samo posle momentum gesta | vrednosti ispod                                                      |
| Velocity handoff          | `onDragEnd` koristi `info.velocity.y`; Motion nastavlja spring sa trenutnom brzinom (nema šava)                        | `AppModal`                                                           |
| Momentum / projection     | Sheet: dismiss kad je `offset.y > 120px` ili `velocity.y > 600px/s`; inače snap-back spring                            | `AppModal`                                                           |
| Rubber-banding            | `dragElastic={{ top: 0.02, bottom: 0.5 }}` — otpor raste ka granici                                                    | `AppModal`                                                           |
| Spatial consistency       | Sheet ulazi i izlazi sa dna istim putem; scrim fade sinhronizovan                                                      | `AppModal`                                                           |
| Materijali                | Sticky header/nav: `backdrop-blur-xl backdrop-saturate-150` + gradijent fade ivice umesto 1px linije                   | `TabLayout`                                                          |
| Multimodal                | Web: bez haptike/zvuka (nema pouzdanog API-ja); feedback je vizuelni na istom frejmu kao akcija                        | —                                                                    |
| Reduced motion            | Media blok gasi animacije/tranzicije; Motion komponente koriste `useReducedMotion` (bez drag/scale, samo opacity)      | `theme.css`, `lib/motion.ts`, `AppModal`                             |
| Reduced transparency      | `prefers-reduced-transparency` → solidna pozadina za sve blur površine                                                 | `theme.css`                                                          |
| Contrast                  | `prefers-contrast: more` → svetliji tekst i border tokeni                                                              | `theme.css`                                                          |
| Tipografija               | Negativan tracking na naslovima (-0.015em), `tracking-display` token za velike brojeve, `font-optical-sizing: auto`    | `theme.css`                                                          |
| A11y                      | `focus-visible` ringovi, `aria-pressed`, focus trap + restore, `aria-labelledby`, `role="status"`                      | sve komponente                                                       |

## 2. Spring vrednosti (jedinstven sistem)

| Interakcija            | Parametri                                                                           | Fajl                            |
| ---------------------- | ----------------------------------------------------------------------------------- | ------------------------------- |
| Tap / press            | `bounce: 0, duration: 0.25`; skala 0.97 (0.9 za ikone, 0.96 za ćelije nedelje)      | `lib/motion.ts` (`useTapProps`) |
| Sheet ulaz/izlaz       | `bounce: 0, duration: 0.35`                                                         | `AppModal`                      |
| Scrim fade             | `duration: 0.2` (opacity)                                                           | `AppModal`                      |
| Drag dismiss threshold | `offset.y > 120` ili `velocity.y > 600`                                             | `AppModal`                      |
| Progress ring          | CSS tranzicija `600ms cubic-bezier(0.22, 1, 0.36, 1)` (gasi je reduced-motion blok) | `ProgressRing`                  |

## 3. Inventar (implementirano)

- `app/src/lib/motion.ts` — `useTapProps()`; poštuje `prefers-reduced-motion`.
- `app/src/components/ui/AppButton.tsx` — `motion.button`, tap spring, `focus-visible` ring.
- `app/src/components/ui/IconButton.tsx` — 44px hit target, tap spring, aria-label.
- `app/src/components/ui/AppModal.tsx` — bottom sheet: draggable handle, spring, rubber-band,
  velocity-aware dismiss, focus trap, `aria-labelledby`, close dugme, blur scrim.
- `app/src/components/ui/ConfirmDialog.tsx`, `QueryError.tsx`, `ProgressRing.tsx` — novi primitivi.
- `app/src/components/ui/SegmentedControl.tsx` — `aria-pressed`, arrow keys, active scale.
- `app/src/components/layout/TabLayout.tsx` — translucidan header/nav sa saturacijom i fade ivicama,
  `env(safe-area-inset-bottom)`, press feedback na tabovima.
- `app/src/styles/theme.css` — reduced-motion/transparency/contrast blokovi, `tracking-display`,
  kontrastno popravljen `--color-text-muted` (#8391ab, ≥4.5:1 na surface-elevated).
- Danas: `today-hero` sa inline weather verdiktom (hint u pravcu gesta), `week-board` sa
  `ProgressRing`, `NextWorkoutCard`, `RecentActivityCard`.

## 4. Sledeći koraci (nije u ovom krugu)

1. **Segmented pill sa `layoutId`** — izabrani segment klizi između opcija (spring `bounce: 0, duration: 0.3`).
2. **Tab indikator** — aktivni tab dobija klizeći pill/underline (`layoutId`).
3. **Page tranzicije** — `AnimatePresence` fade/rise između tabova (samo opacity pod reduced-motion).
4. **Scroll edge** — maska koja nestaje kad je skrol na vrhu (trenutno uvek vidljiv fade).
5. **Momentum karusel** — ako se doda horizontalni week pager: projection formula iz skilla
   (`current + (v/1000)·d/(1−d)`, d ≈ 0.998) + velocity handoff.
6. **`prefers-contrast` audit** — proveriti sve parove boja posle svake izmene palete.

## 5. Verifikacija

- E2E: `reduced motion › aplikacija radi bez animacija` (Playwright `reducedMotion: 'reduce'`) prolazi.
- Sve interakcije koje E2E dira (modal, swap, skip, log) rade sa pravim pointer/click događajima na
  Motion elementima.
- Ručno: sheet dismiss swipe-om, dugme reaguje na dodir (ne na release), blur materijali pod
  `prefers-reduced-transparency` postaju solidni.
