import type { Achievement, AchievementFamily } from '@runcast/shared';
import { clsx } from 'clsx';
import { Award, Dumbbell, Flag, Flame, Mountain, Route, TrendingUp, Trophy, Zap } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppCard } from '@/components/ui/AppCard';

const FAMILY_ICONS: Record<AchievementFamily, typeof Award> = {
  first: Award,
  sessions: TrendingUp,
  streakWeeks: Flame,
  long: Mountain,
  tempo: Zap,
  km: Route,
  race: Flag,
  strength: Dumbbell,
  pb: Trophy,
};

const TIER_TONES = {
  1: 'neutral',
  2: 'primary',
  3: 'warning',
  4: 'success',
} as const;

interface BadgeTileProps {
  family: AchievementFamily;
  levels: Achievement[];
  fresh?: boolean;
}

export function BadgeTile({ family, levels, fresh = false }: BadgeTileProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const earned = levels.filter((level) => level.unlockedAt !== null);
  const next = levels.find((level) => level.unlockedAt === null) ?? null;
  const headline = next ?? earned[earned.length - 1];
  if (!headline) return null;
  const state = earned.length > 0 ? 'earned' : 'locked';
  const Icon = FAMILY_ICONS[family];
  const chips = earned.filter((level) => level.id !== headline.id);
  const progressPct = next ? Math.min(100, Math.round((next.progress.current / next.progress.target) * 100)) : 0;
  const remaining = next ? Math.max(1, Math.ceil(next.progress.target - next.progress.current)) : 0;

  return (
    <motion.div
      initial={fresh && !reduceMotion ? { scale: 1.06 } : false}
      animate={{ scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.25, duration: 0.4 }}
    >
      <AppCard
        data-testid={`achievement-${family}`}
        data-state={state}
        className={clsx('h-full space-y-2.5', state === 'earned' && 'border-primary/30')}
      >
        <div className="flex items-start gap-2">
          <span
            className={clsx(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
              state === 'earned' ? 'bg-primary-soft text-primary-ink' : 'bg-surface-elevated text-text-muted',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <p className={clsx('min-w-0 flex-1 text-sm font-semibold', state === 'locked' && 'text-text-secondary')}>
            {t(headline.title.key, headline.title.params)}
          </p>
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((level) => (
              <AppBadge key={level.id} tone={TIER_TONES[level.tier]}>
                {t(level.title.key, level.title.params)}
              </AppBadge>
            ))}
          </div>
        ) : null}

        {next ? (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex items-center justify-between gap-2 text-caption text-text-muted">
              <span className="truncate">
                {t('content:achievements.progress', { remaining, title: t(next.title.key, next.title.params) })}
              </span>
              <span className="num shrink-0">
                {next.progress.current}/{next.progress.target}
              </span>
            </div>
          </div>
        ) : null}
      </AppCard>
    </motion.div>
  );
}
