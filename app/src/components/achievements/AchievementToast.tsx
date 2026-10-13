import type { Achievement } from '@runcast/shared';
import { Award, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/IconButton';

const AUTO_DISMISS_MS = 5000;

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!achievement) return;
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [achievement, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
      <AnimatePresence>
        {achievement ? (
          <motion.div
            key={achievement.id}
            role="status"
            aria-live="polite"
            data-testid="achievement-toast"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, transition: { duration: 0.18, ease: 'easeOut' } }
            }
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.3 }}
            className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-primary/40 bg-surface p-3.5 shadow-card"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-ink">
              <Award className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="section-label">{t('content:achievements.toastTitle')}</p>
              <p className="text-sm font-semibold">{t(achievement.title.key, achievement.title.params)}</p>
              <p className="text-caption text-text-secondary">
                {t(achievement.description.key, achievement.description.params)}
              </p>
            </div>
            <IconButton label={t('common:actions.close')} onClick={onDismiss} className="-mr-1 -mt-1 h-8 w-8">
              <X className="h-4 w-4" />
            </IconButton>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
