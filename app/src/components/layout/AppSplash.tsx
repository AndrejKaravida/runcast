import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { RunnerMark } from '@/components/layout/RunnerMark';

const MIN_VISIBLE_MS = 700;
const MAX_VISIBLE_MS = 2500;
const FADE_OUT_MS = 250;

export function AppSplash() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const startedAt = performance.now();
    let readyTimer: number | undefined;
    let removeTimer: number | undefined;

    const fadeOut = () => {
      setLeaving(true);
      removeTimer = window.setTimeout(() => setMounted(false), FADE_OUT_MS);
    };

    const readyFrame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        readyTimer = window.setTimeout(fadeOut, Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt)));
      }),
    );
    const maxTimer = window.setTimeout(fadeOut, MAX_VISIBLE_MS);

    return () => {
      cancelAnimationFrame(readyFrame);
      window.clearTimeout(readyTimer);
      window.clearTimeout(maxTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      data-testid="app-splash"
      aria-hidden
      className={clsx(
        'app-splash pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-bg',
        !reduceMotion && 'app-splash--animated',
        leaving && 'app-splash--leaving',
      )}
    >
      <RunnerMark className="app-splash__runner h-24 w-24 text-text-muted" />
      <span className="text-2xl font-semibold tracking-[var(--tracking-display)] text-text">{t('appName')}</span>
    </div>
  );
}
