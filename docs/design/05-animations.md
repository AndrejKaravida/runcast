# 05 — Animacije: istraživanje + predlog nadogradnje (v1)

Cilj: podići osećaj kvaliteta bez novih dependency-ja i bez jeftinog slavlja. Sve je Motion-only, gated sa `useReducedMotion()`, i ne menja Apple design pass koji već postoji.

Kontekst (postojeće, ne dirati): press spring `useTapProps` (`lib/motion.ts`, bounce 0, 250ms), sheet `AppModal` (spring bounce 0, 350ms), page fade `TabLayout` (180ms easeOut), tab pill (spring bounce 0, 300ms), toast ulaz (220ms), `value-swap` (240ms fade/slide).

Pravila za ceo set:

- Feedback ≤ 250ms; ulazne „content reveal" animacije (count-up, barovi) su izuzetak — max ~600–700ms, jednom po mountu.
- Redovno: samo `transform`/`opacity`/`stroke-dashoffset`; nikad `height`/`top`/`width`; nikad petlje.
- Reduced motion → finalno stanje odmah (postojeći obrazac); animacija nikad nije jedini nosilac informacije.
- Haptika: `navigator.vibrate` ne radi na iOS-u (WebKit ga odbija) → ne planirati haptiku na webu.

## Istraživanje: šta rade vodeći

| App           | Pattern                                                                            | Naučiti                                                     |
| ------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Strava        | Kudos spring pop + 8 mini čestica (~600ms); PR trofej 1→1.1→1 spring (~600ms feel) | Mikro-slavlje u samom elementu, ne preko celog ekrana       |
| Nike Run Club | PR = ~1.2s restrained Lottie + haptic pa fade; achievement fullscreen expansion    | Slavlje je kratko i „tactile", ne slot-machine              |
| Runna         | Kalendar se puni zelenim check-ovima; Plan Replay/Wrapped                          | Completion stanje je glavna nagrada; paziti na guilt jezik  |
| Garmin        | Badge se dodeljuje odmah (bez čekanja), serije i progres ka sledećem               | Instant feedback i „šta je sledeće", ne samo trenutni badge |
| Apple Fitness | Prstenovi animiraju inkrementalno; close = soft bloom, jedini flourish u sistemu   | Jedan finish flourish po sistemu, sve ostalo tiho           |
| Duolingo      | Streak milestone = transformacija lika + rhythm; 5 principa motion tima            | „Get to the point", ritam, bez flourisha bez razloga        |

Craft pravila (NN/g, Material, Motion docs, ostalo): NNG 100–500ms, ulaz duži od izlaza, ease-out za ulaz; count-up ide uz `tabular-nums`, tick je `aria-hidden`, finalnu vrednost čita SR, i nikad se ne restartuje na refetch; barovi rastu iz baseline (`scaleY`, origin bottom), stagger 30–80ms, nikad loop; skeleton→content crossfade ~200ms; check draw: ring ~420ms + tick ~280ms sa malim preklapanjem; confetti/celebration ima smisla samo ako se ne ponavlja >1× po sesiji.

## „Do NOT" lista

- Confetti/spam čestica, full-screen overlay slavlja, blokiranje klika slavljem.
- Ponavljanje slavlja: re-fire na back-navigaciju, toast na svaki log, badge pop svaki put.
- Loop-ovane animacije grafikona i count-up koji se vrti na svaki refetch/filter.
- Animiranje layout propertija (`height`, `top`, `left`) i `transition: all`.
- Bounce/elastic na funkcionalnim dugmadima; overshoot na brojevima koji moraju da se čitaju tačno.
- Animacije duže od ~700ms osim jednokratnog hero reveal-a; zvučni/„alive" efekti bez značenja.
- Oslanjanje na haptiku bilo gde (iOS je nema); guilt copy za propuštene dane uz slavlje.

## Predlozi za v1 (Motion-only, reduced-motion gated)

### 1. Count-up brojevi — P1

Mesta: Stats hero km (`StatsPage.tsx:89`), dani do trke (`RaceChip.tsx:24`, `RaceDayPage.tsx:225`), nedeljni km (`WeekBoard`), streak chip.
Spec: jedan reuse helper (`useMotionValue` + `useTransform`, zaokruživanje, `num` tabular-nums). Hero: `animate(mv, to, { duration: 0.6, ease: [0.22, 1, 0.36, 1] })`; mali brojevi 0.35s. Trigger: prvi mount sa stvarnim podacima (posle skeleton-a); update = samo ako se broj promenio, iz prethodne vrednosti, bez restarta. Postojeći `value-swap` (240ms) ostaje za male diskretne promene.
Reduced motion: finalna vrednost odmah. A11y: tick u `aria-hidden` spanu, finalna vrednost jednom u `sr-only` (ne `aria-live`).
P1: hero km + dani do trke. P2: weekly km + streak.

### 2. Chart/bar entrance — P1

Mesto: `StatsPage` nedeljni barovi (`h-24 w-5`, planned + done sloj).
Spec: planned (cilj) stoji statično, done sloj raste `scaleY 0→1`, `transformOrigin: 'bottom'`; po baru `transition: { type: 'spring', bounce: 0, duration: 0.35 }`, `delay: min(i, 6) * 0.035` (poslednji se vrti ~500ms). Broj iznad bara: opacity 0→1, 180ms, delay +50ms. Bez loop-a; promena raspona/podataka = `value-swap`, ne ponovni ulaz. Napomena: `scaleY` blago spljošti rounded top — pri w-5 i radiusu 6px prihvatljivo.
Reduced motion: barovi na finalnoj visini, bez transform-a.

### 3. ProgressRing — P2 (odluka: ostaje CSS, ne Motion)

Odluka: CSS transition ostaje — jedno `stroke-dashoffset` svojstvo na SVG krugu, Motion spring bi dodao per-frame JS bez vizuelne dobiti; CSS već interpolira i update-e (npr. posle logovanja).
Spec: skratiti 600ms → 450ms, ista kriva (`cubic-bezier(0.22, 1, 0.36, 1)`); dodati jednokratni draw na mount (init `strokeDashoffset = circumference` pa transition) samo u `prefers-reduced-motion: no-preference`.
Reduced motion: puni prsten odmah (fallback = final state).

### 4. Achievement unlock momenat — P1 (tasteful, once)

Postojeće: `AchievementToast` (enter y 12 / 220ms), `seen.ts` „fresh + unseen at mount" guard — reuse, ne praviti novi.
Spec: toast ulaz `{ type: 'spring', bounce: 0.15, duration: 0.3 }`, izlaz 180ms easeOut; `Award` ikona `initial { scale: 0.85, rotate: -8 }` → `spring { bounce: 0.3, duration: 0.35 }`, `delay: 0.08`. BadgeTile pop: samo za family iz `seen.ts` fresh liste, `scale 0.96→1`, `spring { bounce: 0.25, duration: 0.4 }`; ostale pločice statične. Jedan unlock = max jedan pop (seen guard); nikad ponovo na back-nav.
Reduced motion: opacity-only toast, tile statičan. Auto-dismiss 5s ostaje. Bez čestica.

### 5. Završetak treninga na Today — P1

Trigger: uspešna complete/log mutacija (`TodayHeroCard` status menja se u urađeno).
Spec: status red keyed crossfade `key={status}`, `{ opacity: 0, y: 4 }` → `{ opacity: 1, y: 0 }`, 180ms easeOut; check badge uz status `initial { scale: 0.8, opacity: 0 }` → `spring { bounce: 0.25, duration: 0.3 }`. Ako je unlock, postojeći toast dolazi posle state update-a — bez dodatne choreografije. Bez overlay-a, bez confetti-ja.
Reduced motion: instant swap bez `y`/`scale`.

### 6. List stagger na Today/Plan — P2

Trigger: prvi render posle skeleton-a (jednom po mountu). Scope: Today sekcije (hero → week → recent/list) i prvih 6 redova Plan nedelje; ostatak liste bez stagger-a.
Spec: container `staggerChildren: 0.03`; item `{ opacity: 0, y: 4 }` → `{ opacity: 1, y: 0 }`, `duration: 0.2, ease: 'easeOut'`; delay cap 0.15 (posle 6. itema svi isti). P2 jer page fade (180ms) već pokriva deo; dodati samo ako u pregledu ostane mirno.
Reduced motion: bez stagger-a i bez `y`.

### 7. PR / badge broj u Stats — P2

Trigger: prvi prikaz novog PR-a/badge vrednosti.
Spec: broj ide kroz isti count-up helper (0.6s), pa jednokratni underline reveal `scaleX 0→1`, origin left, 180ms easeOut. Bez pulse/glow petlji, bez ponavljanja.
Reduced motion: broj i underline statični.

## Redosled implementacije

P1: 1 (hero km + dani do trke), 2, 4, 5. P2: 3, 6, 7 i ostaci iz 1. Review posle svake grupe; ako nešto ne prolazi „mirno" test, briše se pre dodavanja P2 sloja.

## Izvori

- Strava: support.strava.com (Activity Replay), 60fps.design (Save Activity morph, kudos/PR spec)
- Nike Run Club: 60fps.design (Achievements, End Workout), checkmydesigns.com (motion system: restrained, never cheesy)
- Runna: sgx.studio product report; eidosdesign.substack.com (Plan Replay, „Not Feeling 100%")
- Garmin Connect: medium.com/@pancakefeed (Project Spotlight: Badges, instant gratification, scarcity)
- Apple Fitness: 60fps.design (Metal Badge Showcase), support.apple.com (rings/awards), designbycurio.com (ring close bloom)
- Duolingo: blog.duolingo.com (streak milestone animation), LinkedIn/Inside Design Studio (5 motion principa)
- Timing/easing: nngroup.com/articles/animation-duration, m3.material.io (easing-and-duration)
- Count-up: artofstyleframe.com, scrollhaus.ai (once, tabular-nums, sr-only final value, no restart)
- Chart ulaz: css-animation.com (SVG charts), vawe.dev (chart-build), purecss.com (scaleY origin bottom)
- Skeleton→content: empire-ui.com (crossfade, `AnimatePresence mode="wait"`, cap 8–12)
- Success check: animationpatterns.art, paragon-ui.com (ring 420ms + tick 280ms, reduced = drawn)
- Confetti granice: vocab.design (confetti burst), uxdesign.cc (F-E-A-T), uxplanet.org (backfire)
- Haptika: w3c.github.io/vibration (implementation report), caniuse.com/vibration (iOS unsupported)
- Motion: motion.dev/docs/spring i motion.dev/docs/react-transitions (`bounce`, `visualDuration`)
