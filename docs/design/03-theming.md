# 03 — Theming arhitektura: light/dark (T1, zadatak A3)

Stack: Vite + React 19 + Tailwind v4 (`app/src/styles/theme.css`, `@theme` tokeni) + Motion + Supabase.
Deploy: Cloudflare Pages (`app/public/_headers` sa CSP). Trenutno: samo dark, bez ThemeProvider-a.
Cilj: sistemska preferencija + korisnički override (Sistem / Svetla / Tamna), `data-theme` na `<html>`,
WCAG AA u obe teme, bez FOUC-a, bez izmena Motion/reduced-motion ponašanja.

## 1. Inventar hardkodovanih boja

**A) Literalne vrednosti koje se menjaju (24 ukupno: 18 hex, 5 rgba, 1 `bg-black/60`):**

| Fajl:linija                     | Vrednost                         | Akcija                                         |
| ------------------------------- | -------------------------------- | ---------------------------------------------- |
| `styles/theme.css:7-31`         | 14 hex tokena + 5 `rgba()` soft  | podeliti na dark (default) + light override    |
| `styles/theme.css:42`           | `color-scheme: dark`             | dark default; `[data-theme='light']` → `light` |
| `styles/theme.css:79-89`        | 3 hex u `prefers-contrast: more` | dodati light varijante istih                   |
| `index.html:6`                  | `#0B0F1A` `meta[theme-color]`    | dinamički (inline script + Provider)           |
| `components/ui/AppModal.tsx:64` | `bg-black/60` scrim              | `bg-scrim` token (light: slabiji)              |

Sve ostalo u `app/src` (ukupno ~300 upotreba boja) ide preko tokena — nema drugih literala.

**B) Token-potrošači kojima treba „ink" uloga za light (migracija imena, dark izgled nepromenjen):**

| Fajl                                                                                                  | Linije                         | Izmena                                                              |
| ----------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| `ui/AppButton.tsx`                                                                                    | 18, 21                         | `text-bg→text-on-accent`, `text-danger→text-danger-ink`             |
| `ui/SegmentedControl.tsx`                                                                             | 48                             | `text-bg→text-on-accent`                                            |
| `workouts/WeekStrip.tsx` + `features/workouts/utils.ts`                                               | 27, 33, 37; 38-44              | `text-primary→*-ink`; `TONE_DOT_CLASSES` → `bg-*-ink`               |
| `ui/AppBadge.tsx` / `workouts/PaceZoneBadge.tsx`                                                      | 14-18 / 4-8                    | `text-*→text-*-ink`                                                 |
| `ui/ProgressRing.tsx`                                                                                 | 23, 31                         | track → `var(--color-ring-track)`, arc → `var(--color-primary-ink)` |
| `weather/WeatherSummaryCard.tsx`                                                                      | 68                             | `text-rain→text-rain-ink`                                           |
| `pages/StatsPage.tsx`                                                                                 | 91                             | `bg-primary/80→bg-chart-bar`                                        |
| `pages/OnboardingPage.tsx`                                                                            | 246, 334, 455, 514             | progress fill → `bg-primary-ink`; `text-primary/rain/warning→*-ink` |
| `pages/TodayPage.tsx`                                                                                 | 275, 278, 291, 292, 300        | `text-primary→primary-ink`, `text-success→success-ink`              |
| `pages/PlanPage.tsx` / `pages/GuidedRunPage.tsx` / `NotFoundPage.tsx` / `layout/FullScreenLoader.tsx` | 156 / 244, 256 / 8 / 6         | `text-*→*-ink`                                                      |
| `pages/LoginPage.tsx`                                                                                 | 38, 61, 74                     | logo/link → `primary-ink`; `text-danger→danger-ink`                 |
| `pages/RegisterPage.tsx`                                                                              | 55, 67, 105, 116               | isto kao Login                                                      |
| `pages/ForgotPasswordPage.tsx` / `pages/ResetPasswordPage.tsx`                                        | 44, 62 / 48, 78                | isto                                                                |
| `pages/SettingsPage.tsx`                                                                              | 275, 392, 395                  | `text-rain/success/danger→*-ink`                                    |
| `workouts/RecentActivityCard.tsx` / `LogWorkoutModal.tsx` / `WhyCard.tsx` / `forms/CityPicker.tsx`    | 13, 26 / 96, 116 / 30 / 83, 87 | `text-*→*-ink`                                                      |
| `ui/AppInput.tsx` / `AppSelect.tsx` / `AppTextarea.tsx`                                               | 29 / 38 / 28                   | error `text-danger→danger-ink`                                      |
| `layout/TabLayout.tsx`                                                                                | 15, 18, 26, 36                 | materijali (blur) + logo/aktivni tab `→primary-ink`                 |
| `ui/AppCard.tsx` / `AppModal.tsx`                                                                     | 5 / 91                         | dodati `shadow-card` (light elevacija)                              |
| Tipske mape (`CoachInsightsCard`, `PredictorCard`, guided)                                            | —                              | samo tokeni; bez izmena, verifikovati u light                       |

## 2. Light paleta (isti tokeni; dark vrednosti ostaju netaknute)

Konstante u obe teme: `--color-primary #FF6B4A`, `--color-primary-pressed #E85535` (hover fill dugmadi),
`--color-rain #4DA6FF`, `--color-success #3DDC97`, `--color-warning #FFC24D`, `--color-danger #FF5470`,
`--color-on-accent #0B0F1A` (tekst na koloritu: 6.79:1 na primary, 5.27:1 na pressed, 6.15:1 na danger,
10.83:1 na success — prolazi AA jer su dugmad ≥14px semibold suštinski „normalan" tekst).

| Token                       | Dark                  | Light                                                        | Kontrast (light, izmereno)        |
| --------------------------- | --------------------- | ------------------------------------------------------------ | --------------------------------- |
| `--color-bg`                | `#0b0f1a`             | `#f6f6f4`                                                    | podloga                           |
| `--color-surface`           | `#121a2b`             | `#ffffff`                                                    | podloga kartica                   |
| `--color-surface-elevated`  | `#1b2439`             | `#f0efec`                                                    | podloga čipova                    |
| `--color-border`            | `#232f47`             | `#dedbd4`                                                    | dekorativno (1.38:1) + shadow     |
| `--color-scrim`             | `rgba(0,0,0,.6)`      | `rgba(20,24,31,.35)`                                         | modal backdrop                    |
| `--color-text`              | `#f5f7fb`             | `#15181e`                                                    | 17.8:1 / bg 16.4:1                |
| `--color-text-secondary`    | `#a5b0c6`             | `#4e5560`                                                    | 7.5:1 / elevated 6.5:1            |
| `--color-text-muted`        | `#8391ab`             | `#626b78`                                                    | 5.4:1 / bg 5.0:1 / elevated 4.7:1 |
| `--color-primary-ink`       | `#ff6b4a`             | `#be3b0b`                                                    | 5.5:1; na primary-soft 4.76:1     |
| `--color-primary-ink-hover` | `#e85535`             | `#9c3208`                                                    | 7.3:1 (hover linkova)             |
| `--color-rain-ink`          | `#4da6ff`             | `#135e9e`                                                    | 6.7:1; na rain-soft 5.9:1         |
| `--color-success-ink`       | `#3ddc97`             | `#0f7a50`                                                    | 5.4:1; na success-soft 4.8:1      |
| `--color-warning-ink`       | `#ffc24d`             | `#8a5b00`                                                    | 5.9:1; na warning-soft 5.3:1      |
| `--color-danger-ink`        | `#ff5470`             | `#be2f4c`                                                    | 5.7:1; na danger-soft 4.8:1       |
| `--color-ring-track`        | `#1b2439`             | `#e6e2da`                                                    | arc/track 4.26:1 (UI ≥3:1)        |
| `--color-chart-bar`         | `rgba(255,107,74,.8)` | `#be3b0b`                                                    | 4.5:1 na elevated                 |
| `--shadow-card`             | `0 0 #0000`           | `0 1px 2px rgba(21,24,30,.05), 0 1px 3px rgba(21,24,30,.04)` | elevacija u light                 |

Soft tokeni u light (preko belog → chip pozadine): primary `rgba(255,107,74,.14)`, rain `rgba(77,166,255,.16)`,
success `rgba(61,220,151,.18)`, warning `rgba(255,194,77,.22)`, danger `rgba(255,84,112,.14)`.
Pravila: boja (fill) ostaje brand; **tekst ikone/dim/dijagrami na svetloj podlozi koriste `-ink`**;
tekst na koloritu uvek `on-accent` (nikad `text-bg`); materijali u light: zadržati `backdrop-blur-xl`,
ali osloniti se na `shadow-card`/fade gradijent jer belo-na-belom nema ivicu; `prefers-reduced-transparency`
i `prefers-contrast` override-i ostaju, sa light vrednostima (border `#b9b3a8`, secondary `#3a414c`, muted `#4e5766`).

## 3. Arhitektura

**Novi fajlovi:** `app/src/theme/ThemeProvider.tsx` (context + `useTheme()` → `{ preference, resolved, setPreference }`;
storage ključ **`runcast.theme`** = `'light'|'dark'|null`; `matchMedia('(prefers-color-scheme: dark)')` listener samo kad je
preference `null`; apply piše `document.documentElement.dataset.theme` + `meta[theme-color].content`),
`app/src/components/ui/ThemeToggle.tsx` (SegmentedControl varijanta + icon varijanta za header), `app/e2e/theme.spec.ts`,
`app/scripts/check-contrast.mjs` (pure Node, bez depova: parsira tokene iz `theme.css`, računa WCAG parove iz §2).

**Izmena:** `index.html` (meta `color-scheme`, inline resolver, CSP hash), `public/_headers` (`script-src 'self' 'sha256-…'`),
`main.tsx` (wrap `<ThemeProvider>` oko `RouterProvider`), `SettingsPage` (sekcija „Izgled"), `TabLayout` (brzi toggle),
`playwright.config.ts` (`colorScheme: 'dark'`), + fajlovi iz §1B.

**CSS struktura (`theme.css`):** `@theme` ostaje **non-inline** (default = dark vrednosti); light override ide u
**unlayered** `[data-theme='light'] { … }` blok (unlayered pobeđuje sve `@layer`-e, pa nema specifičnosti igre).
`@theme inline` bi zakovao vrednosti u utility i pokvario override (tailwindlabs #15122) — ne koristiti.
Soft `rgba()` tokeni ne primaju `/alpha` modifikator (npr. `bg-primary-soft/50`) — ne uvoditi.

```css
@theme { /* dark default */
  --color-bg: #0b0f1a; … --color-primary-ink: #ff6b4a; --color-on-accent: #0b0f1a;
  --color-scrim: rgba(0,0,0,.6); --color-ring-track: #1b2439; --color-chart-bar: rgba(255,107,74,.8);
  --shadow-card: 0 0 #0000;
}
[data-theme='light'] {
  color-scheme: light;
  --color-bg: #f6f6f4; --color-surface: #ffffff; --color-surface-elevated: #f0efec; --color-border: #dedbd4;
  --color-scrim: rgba(20,24,31,.35); --color-text: #15181e; --color-text-secondary: #4e5560; --color-text-muted: #626b78;
  --color-primary-ink: #be3b0b; --color-primary-ink-hover: #9c3208; … --shadow-card: 0 1px 2px rgba(21,24,30,.05), 0 1px 3px rgba(21,24,30,.04);
}
@layer base { html { color-scheme: dark; } }
```

**FOUC resolver** (`index.html`, sinhrono, inline, jedan red zbog stabilnog hasha):
`<meta name="color-scheme" content="dark light">` pre skripte; skripta čita `localStorage['runcast.theme']`,
`matchMedia`, postavlja `data-theme` i `meta[theme-color]` (`#0B0F1A` / `#F6F6F4`) u `try/catch`.
CSP `script-src 'self'` blokira inline — u `_headers` dodati `'sha256-<base64>'` hash tačnog inline tela
(`openssl dgst -sha256 -binary snippet.js | openssl base64`); alternativa ako hash postane krhak: render-blocking
`<script src="/theme-init.js">` iz `public/` (CSP `'self'` ga propušta, uz manji rizik od bljeska). Default bez JS:
dark (SPA ionako ne radi bez JS-a). `color-scheme` preko meta + CSS pokriva scrollbar-e, date/select kontrole.

**Motion:** bez izmena — `useReducedMotion` i CSS `prefers-reduced-motion` override u `theme.css:60-69` su nezavisni od
teme; Motion animira samo `opacity`/transform (tap, drag, scrim), nema Motion-driven boja. Ne dodavati globalni
`transition` na `background-color` (tema se menja bez animacije); budući View Transitions guard-ovati sa reduced-motion.

## 4. Toggle UX

- **Settings → „Izgled":** `SegmentedControl` sa tri opcije `Sistem | Svetla | Tamna` (reuse postojeće komponente);
  `Sistem` briše `runcast.theme` i prati OS uživo (matchMedia listener), `Svetla`/`Tamna` pišu eksplicitno.
- **Brzi toggle u headeru (`TabLayout`):** Sun/Moon `IconButton`; prikazuje trenutnu rezoluciju, klik postavlja
  eksplicitnu suprotnu temu; `aria-label` se menja („Prebaci na svetlu/tamnu"), `aria-pressed` sinhronizovan.
- Preferencija se ne čuva u Supabase (nije nalog-scoped); cross-tab `storage` event — opciono, nije u MVP-u.

## 5. Test plan

**`app/e2e/theme.spec.ts`** (config `use.colorScheme: 'dark'` = headless default → dark):

1. svež kontekst (localStorage prazan) + `colorScheme: 'dark'` → `html[data-theme='dark']` i computed `body` bg `rgb(11,15,26)`;
2. `page.emulateMedia({ colorScheme: 'light' })` na svežem kontekstu → `data-theme='light'`, bg `rgb(246,246,244)`;
3. toggle na Svetla u Settings → `data-theme='light'`, `localStorage['runcast.theme']='light'`, `meta[theme-color]='#f6f6f4'`, reload → ostaje + nema bljeska atributa;
4. eksplicitni dark na light OS: posle reload-a `data-theme='dark'` iako `emulateMedia` light;
5. `Sistem` briše ključ; promena `emulateMedia` uživo menja `data-theme` (matchMedia listener);
6. brzi toggle u headeru menja temu i upisuje eksplicitnu preferenciju;
7. responsive: obe teme × `{320, 1440}` × rute `/today /plan /stats /settings /workout/:id` + modal, kroz postojeći
   `assertNoHorizontalOverflow` iz `e2e/helpers.ts` (light pokriva T1 kapiju „responsive i u light temi").

**Postojeći specovi:** `app/responsive/coach/guided/predictor/why` koriste isključivo `getByText/getByTestId/aria/role`
selektore — bez zavisnosti od boja/klasa — ne smeju se slomiti; uz `colorScheme:'dark'` u configu zadržavaju dark baseline.
**Unit-ish:** `node app/scripts/check-contrast.mjs` u kapiji T1 — asertuje parove iz §2 (text/secondary/muted, svi `-ink`
na surface/bg/soft, on-accent na fillovima, ink vs ring-track, bar vs elevated); pad CI ako padne ispod AA.
**Manuelno:** iOS Safari address-bar boja, Android Chrome `theme-color`, FOUC na hard reload-u u oba smera (throttle),
scrollbar/date input u obe teme, `prefers-reduced-transparency`/`prefers-contrast`, screenshot obe teme.

## 6. Rizici

- **CSP hash krhkost:** svaka izmena inline skripte menja hash → E2E mora pasti ako je skripta blokirana (nema `data-theme`);
  alternativa `/theme-init.js`.
- **Difuznost migracije „ink":** ~30 fajlova; mitigacija — u dark `-ink == fill`, pa dark screenshot ostaje identičan.
- **Tailwind `@theme inline` zamka** i `/alpha` na rgba soft tokenima — dokumentovati u `theme.css` zaglavlju.
- **Light elevacija:** bez `shadow-card` kartice na belom izgledaju ravno; scrim u light mora biti slabiji (35%), inače „crna rupa".
- **Sistemski listener:** OS promena dok je eksplicitna preferencija aktivna ne sme da je pregazi (guard `null`).
- **Vizuelne regresije:** nema commitovanih screenshot baseline-a; rizik pokriva tek gate „screenshot kontrola obe teme".
