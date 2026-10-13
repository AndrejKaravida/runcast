import type { WeeklyChallenge } from '@runcast/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppCard } from '@/components/ui/AppCard';
import { CountUp } from '@/components/ui/CountUp';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { WeekStrip } from '@/components/workouts/WeekStrip';
import type { WeekProgress } from '@/features/plans/progress';
import type { WorkoutsRow } from '@/types';

function formatKm(value: number): string {
  return String(Math.round(value * 10) / 10);
}

interface WeekBoardProps {
  week: WeekProgress;
  challenge: WeeklyChallenge | null;
  workouts: WorkoutsRow[];
  today: string;
}

export function WeekBoard({ week, challenge, workouts, today }: WeekBoardProps) {
  const { t } = useTranslation('today');
  return (
    <AppCard data-testid="week-board" className="space-y-3">
      <SectionHeader
        label={t('week.title')}
        action={
          <Link to="/plan" className="text-sm font-medium text-primary-ink hover:text-primary-ink-hover">
            {t('week.all')}
          </Link>
        }
      />
      <div className="flex items-center gap-4">
        <ProgressRing value={week.plannedSessions > 0 ? week.doneSessions / week.plannedSessions : 0}>
          <span className="num text-caption font-semibold">
            {week.doneSessions}/{week.plannedSessions}
          </span>
        </ProgressRing>
        <div className="min-w-0">
          <p data-testid="weekly-km" className="num text-stat font-semibold">
            <CountUp value={week.doneKm} format={formatKm} duration={0.35} />{' '}
            <span className="text-base font-medium text-text-secondary">/ {week.plannedKm} km</span>
          </p>
          <p className="text-caption text-text-muted">
            {t('week.summary', { done: week.doneSessions, planned: week.plannedSessions })}
          </p>
        </div>
      </div>
      <WeekStrip workouts={workouts} today={today} />
      {challenge ? (
        <div
          data-testid="weekly-challenge"
          className="flex items-center justify-between gap-2 border-t border-border pt-3"
        >
          <span className="section-label">{t('content:achievements.challenge.label')}</span>
          <span className="num flex min-w-0 items-center gap-1.5 truncate text-caption font-medium text-text-secondary">
            {t(challenge.sessionsText.key, challenge.sessionsText.params)}
            {challenge.longText ? (
              <span className={challenge.longDone ? 'text-success-ink' : 'text-text-muted'}>
                · {t(challenge.longText.key, challenge.longText.params)}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
    </AppCard>
  );
}
