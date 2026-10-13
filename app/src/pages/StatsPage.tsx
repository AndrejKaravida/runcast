import { useMemo } from 'react';
import { formatDuration, formatPace } from '@runcast/shared';
import { BarChart3, History } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AchievementToast } from '@/components/achievements/AchievementToast';
import { AchievementsGrid } from '@/components/achievements/AchievementsGrid';
import { AppCard } from '@/components/ui/AppCard';
import { AppLinkButton } from '@/components/ui/AppLinkButton';
import { CountUp } from '@/components/ui/CountUp';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { QueryError } from '@/components/ui/QueryError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatRow } from '@/components/ui/StatRow';
import { CoachInsightsCard } from '@/components/workouts/CoachInsightsCard';
import { LoadCard } from '@/components/workouts/LoadCard';
import { PersonalBestsCard } from '@/components/workouts/PersonalBestsCard';
import { PredictorCard } from '@/components/workouts/PredictorCard';
import { useAchievementCelebration } from '@/features/achievements/seen';
import { useRunLogs } from '@/features/logs/queries';
import { planAnchor, planPaces } from '@/features/plans/plan-data';
import { adherencePct, isRunWorkout, loggedKm, runStreak, weeklyKmSeries } from '@/features/plans/progress';
import { useActivePlan, useWorkoutsRange } from '@/features/plans/queries';
import { dayDiff, formatDateShort, startOfWeekIso, todayIso } from '@/lib/dates';

function weekLabel(week: string): string {
  return `${week.slice(8, 10)}.${week.slice(5, 7)}.`;
}

function formatKm(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function StatsPage() {
  const { t } = useTranslation('stats');
  const reduceMotion = useReducedMotion();
  const today = todayIso();
  const { data: plan, isLoading: planLoading, isError: planError, refetch } = useActivePlan();
  const { data: workouts = [], isLoading: workoutsLoading } = useWorkoutsRange(
    plan?.start_date ?? today,
    plan?.race_date ?? today,
  );
  const { data: logs = [] } = useRunLogs();
  const { achievements, achievement, dismiss, fresh } = useAchievementCelebration(workouts, logs, undefined);

  const stats = useMemo(() => {
    const series = weeklyKmSeries(workouts, today, 8);
    const plannedToDate =
      Math.round(
        workouts
          .filter((workout) => isRunWorkout(workout) && workout.workout_date <= today)
          .reduce((sum, workout) => sum + workout.distance_km, 0) * 10,
      ) / 10;
    return {
      doneKm: loggedKm(logs),
      plannedToDate,
      completion: Math.min(100, adherencePct(workouts, plan?.start_date ?? today, today)),
      streak: runStreak(workouts, today),
      series,
      maxWeek: Math.max(...series.map((entry) => entry.planned), 1),
    };
  }, [workouts, logs, today, plan]);

  if (planLoading || workoutsLoading) return <Skeleton className="h-96" />;
  if (planError) return <QueryError onRetry={() => void refetch()} />;

  if (!plan) {
    return (
      <EmptyState
        title={t('empty.title')}
        description={t('empty.description')}
        icon={<BarChart3 className="h-6 w-6" />}
        action={
          <AppLinkButton to="/settings" size="sm">
            {t('empty.action')}
          </AppLinkButton>
        }
      />
    );
  }

  const daysToRace = dayDiff(today, plan.race_date);
  const paces = planPaces(plan);
  const anchor = planAnchor(plan);
  const progressPct =
    stats.plannedToDate > 0 ? Math.min(100, Math.round((stats.doneKm / stats.plannedToDate) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="section-label">{t('summary.label')}</p>
        <p className="flex items-baseline gap-2">
          <CountUp value={stats.doneKm} format={formatKm} className="num text-hero font-bold" />
          <span className="text-base font-medium text-text-secondary">km</span>
        </p>
        <p className="num text-caption text-text-muted">{t('summary.planned', { km: stats.plannedToDate })}</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <StatRow
        items={[
          { label: t('row.completion'), value: `${stats.completion}%` },
          { label: t('row.streak'), value: `${stats.streak}` },
          { label: t('row.race'), value: daysToRace >= 0 ? `${daysToRace}` : '—' },
        ]}
        className="rounded-xl bg-surface-elevated py-1"
      />

      <CoachInsightsCard workouts={workouts} logs={logs} today={today} raceDate={plan.race_date} />

      <AppCard className="space-y-3">
        <SectionHeader
          label={t('weekly.title')}
          action={
            <Link to="/leaderboard" className="text-caption font-semibold text-primary-ink">
              {t('leaderboard.title')} →
            </Link>
          }
        />
        <div className="flex gap-1.5">
          {stats.series.map((entry, index) => {
            const isCurrent = entry.week === startOfWeekIso(today);
            return (
              <div key={entry.week} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="num h-4 text-caption text-text-muted">
                  {entry.done > 0 ? Math.round(entry.done) : ''}
                </span>
                <div
                  className="relative h-24 w-5 sm:w-6"
                  title={t('weekly.tooltip', { done: entry.done, planned: entry.planned })}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-md border border-border bg-surface-elevated"
                    style={{ height: `${Math.max((entry.planned / stats.maxWeek) * 100, entry.planned > 0 ? 4 : 0)}%` }}
                  />
                  <motion.div
                    className="absolute inset-x-0 bottom-0 rounded-t-md bg-chart-bar"
                    style={{ height: `${(entry.done / stats.maxWeek) * 100}%`, transformOrigin: 'bottom' }}
                    initial={reduceMotion ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', bounce: 0, duration: 0.35, delay: Math.min(index, 6) * 0.035 }
                    }
                  />
                </div>
                <span
                  className={
                    isCurrent
                      ? 'num max-w-full truncate text-caption font-semibold text-primary-ink'
                      : 'num max-w-full truncate text-caption text-text-muted'
                  }
                >
                  {weekLabel(entry.week)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-caption text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm border border-border bg-surface-elevated" />
            {t('weekly.planned')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-chart-bar" />
            {t('weekly.done')}
          </span>
        </div>
        {stats.series.length > 0 && stats.series.every((entry) => entry.done === 0) ? (
          <p className="text-caption text-text-muted">{t('weekly.noDone')}</p>
        ) : (
          <p className="text-caption text-text-muted">{t('weekly.description')}</p>
        )}
      </AppCard>

      <LoadCard logs={logs} today={today} />

      <AchievementsGrid achievements={achievements} fresh={fresh} />

      <PredictorCard paces={paces} anchor={anchor} raceDistanceKm={plan.races?.distance_km ?? null} />
      <AppLinkButton to="/benchmark" variant="secondary" className="w-full">
        {t('predictor.benchmarkCta')}
      </AppLinkButton>
      <PersonalBestsCard logs={logs} />

      <div className="space-y-2">
        <SectionHeader label={t('recent.title')} />
        {logs.length === 0 ? (
          <EmptyState
            title={t('recent.emptyTitle')}
            description={t('recent.emptyDescription')}
            icon={<History className="h-6 w-6" />}
          />
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 5).map((log) => (
              <ListRow
                key={log.id}
                eyebrow={formatDateShort(log.log_date)}
                title={log.distance_km ? `${log.distance_km} km` : t('recent.fallback')}
                value={
                  <>
                    {log.duration_sec ? <span>{formatDuration(log.duration_sec)}</span> : null}
                    {log.avg_pace_sec_per_km ? <span>{formatPace(log.avg_pace_sec_per_km)} /km</span> : null}
                    {log.rpe ? <span className="text-primary-ink">RPE {log.rpe}</span> : null}
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>

      <AchievementToast achievement={achievement} onDismiss={dismiss} />
    </div>
  );
}
