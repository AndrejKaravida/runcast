import { clsx } from 'clsx';
import { BarChart3, CalendarDays, House, Settings } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation, useOutlet } from 'react-router';
import { useHealthAutoImport } from '@/features/health/queries';

const tabs = [
  { to: '/today', labelKey: 'nav.today', icon: House },
  { to: '/plan', labelKey: 'nav.plan', icon: CalendarDays },
  { to: '/stats', labelKey: 'nav.stats', icon: BarChart3 },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function TabLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  useHealthAutoImport();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const pillTransition: Transition = reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.3 };
  const pageTransition: Transition = { duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col bg-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-xl focus:border focus:border-border focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        {t('a11y.skipToContent')}
      </a>
      <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex w-full max-w-[720px] items-center justify-between px-4 py-3">
          <span className="text-base font-bold tracking-tight">
            Run<span className="text-primary-ink">Cast</span>
          </span>
        </div>
        <div
          className={clsx(
            'pointer-events-none absolute inset-x-0 -bottom-4 h-4 bg-gradient-to-b from-bg/80 to-transparent transition-opacity duration-200',
            scrolled ? 'opacity-100' : 'opacity-0',
          )}
        />
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-4 outline-none"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={pageTransition}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="pointer-events-auto mx-auto max-w-[420px] rounded-2xl border border-border/70 bg-surface/85 shadow-card backdrop-blur-xl backdrop-saturate-150">
          <div className="grid grid-cols-4 p-1.5">
            {tabs.map(({ to, labelKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'relative flex select-none flex-col items-center gap-0.5 rounded-xl py-2 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.97]',
                    isActive ? 'text-primary-ink' : 'text-text-secondary hover:text-text',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        layoutId="tab-pill"
                        transition={pillTransition}
                        aria-hidden
                        className="absolute inset-0 rounded-xl bg-primary-soft"
                      />
                    ) : null}
                    <Icon className="relative z-10 h-5 w-5" aria-hidden />
                    <span className="relative z-10">{t(labelKey)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
