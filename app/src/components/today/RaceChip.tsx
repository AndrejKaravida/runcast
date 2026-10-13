import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppCard } from '@/components/ui/AppCard';
import { CountUp } from '@/components/ui/CountUp';
import type { ActivePlan } from '@/features/plans/queries';
import { formatDateShort } from '@/lib/dates';

interface RaceChipProps {
  plan: ActivePlan;
  daysToRace: number | null;
  planWeek: number;
}

export function RaceChip({ plan, daysToRace, planWeek }: RaceChipProps) {
  const { t } = useTranslation('today');
  const raceInfo = plan.races;
  const clickable = Boolean(raceInfo && daysToRace !== null && daysToRace >= 0);
  const content = raceInfo ? (
    <>
      <p className="section-label">{t('race.goal')}</p>
      <p className="text-sm font-medium">{raceInfo.name ?? t('race.untitled')}</p>
      {daysToRace !== null && daysToRace >= 0 ? (
        <p className="flex items-baseline gap-2">
          <CountUp value={daysToRace} className="num text-hero font-bold text-primary-ink" />
          <span className="text-sm text-text-secondary">{t('race.daysTo')}</span>
        </p>
      ) : (
        <Link to="/settings" className="block text-sm font-medium text-primary-ink hover:text-primary-ink-hover">
          {t('race.passed')}
        </Link>
      )}
      <p className="num text-caption text-text-muted">
        {formatDateShort(raceInfo.race_date)} · {raceInfo.distance_km} km
      </p>
      <div className="space-y-1 pt-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(100, (planWeek / plan.weeks) * 100)}%` }}
          />
        </div>
        <p className="num text-caption text-text-muted">{t('plan.week', { week: planWeek, weeks: plan.weeks })}</p>
      </div>
    </>
  ) : (
    <>
      <p className="section-label">{t('plan.label')}</p>
      <p className="num text-stat font-semibold">{t('plan.week', { week: planWeek, weeks: plan.weeks })}</p>
    </>
  );

  if (clickable) {
    return (
      <Link to="/race-day" data-testid="race-chip" className="block">
        <AppCard className="space-y-2 border-primary/40 bg-gradient-to-b from-primary-soft to-transparent">
          {content}
          <p className="flex items-center gap-1 pt-1 text-sm font-medium text-primary-ink">
            {t('race.day')} <ArrowRight className="h-4 w-4" aria-hidden />
          </p>
        </AppCard>
      </Link>
    );
  }

  return (
    <AppCard
      data-testid="race-chip"
      className="space-y-2 border-primary/40 bg-gradient-to-b from-primary-soft to-transparent"
    >
      {content}
    </AppCard>
  );
}
