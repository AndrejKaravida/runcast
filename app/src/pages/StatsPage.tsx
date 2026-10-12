import { useMemo } from 'react';
import { formatDuration, formatPace, type PlanAnchor, type PlanPaces } from '@runcast/shared';
import { BarChart3, History } from 'lucide-react';
import { Link } from 'react-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { QueryError } from '@/components/ui/QueryError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatRow } from '@/components/ui/StatRow';
import { CoachInsightsCard } from '@/components/workouts/CoachInsightsCard';
import { PersonalBestsCard } from '@/components/workouts/PersonalBestsCard';
import { PredictorCard } from '@/components/workouts/PredictorCard';
import { useRunLogs } from '@/features/logs/queries';
import { adherencePct, isRunWorkout, loggedKm, runStreak, weeklyKmSeries } from '@/features/plans/progress';
import { useActivePlan, useWorkoutsRange } from '@/features/plans/queries';
import { dayDiff, formatDateShort, startOfWeekIso, todayIso } from '@/lib/dates';

function weekLabel(week: string): string {
  return `${week.slice(8, 10)}.${week.slice(5, 7)}.`;
}

export function StatsPage() {
  const today = todayIso();
  const { data: plan, isLoading: planLoading, isError: planError, refetch } = useActivePlan();
  const { data: workouts = [], isLoading: workoutsLoading } = useWorkoutsRange(
    plan?.start_date ?? today,
    plan?.race_date ?? today,
  );
  const { data: logs = [] } = useRunLogs();

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
      completion: adherencePct(workouts, plan?.start_date ?? today, today),
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
        title="Statistika još čeka prvi trening"
        description="Napravimo plan — brojevi se pune sami dok trčiš."
        icon={<BarChart3 className="h-6 w-6" />}
        action={
          <Link to="/settings">
            <AppButton size="sm">Otvori podešavanja</AppButton>
          </Link>
        }
      />
    );
  }

  const daysToRace = dayDiff(today, plan.race_date);
  const paces = plan.paces as unknown as PlanPaces | null;
  const anchor = plan.anchor as unknown as PlanAnchor | null;
  const progressPct =
    stats.plannedToDate > 0 ? Math.min(100, Math.round((stats.doneKm / stats.plannedToDate) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="section-label">Ukupno pređeno</p>
        <p className="flex items-baseline gap-2">
          <span className="num value-swap text-hero font-bold">{stats.doneKm}</span>
          <span className="text-base font-medium text-text-secondary">km</span>
        </p>
        <p className="num text-caption text-text-muted">od {stats.plannedToDate} km planiranih do danas</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <StatRow
        items={[
          { label: 'Realizacija', value: `${stats.completion}%` },
          { label: 'Dani u nizu', value: `${stats.streak}` },
          { label: 'Do trke', value: daysToRace >= 0 ? `${daysToRace}` : '—' },
        ]}
        className="rounded-xl bg-surface-elevated py-1"
      />

      <CoachInsightsCard workouts={workouts} logs={logs} today={today} raceDate={plan.race_date} />

      <AppCard className="space-y-3">
        <SectionHeader label="Nedeljni kilometri" />
        <div className="flex gap-1.5">
          {stats.series.map((entry) => {
            const isCurrent = entry.week === startOfWeekIso(today);
            return (
              <div key={entry.week} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="num h-4 text-caption text-text-muted">
                  {entry.done > 0 ? Math.round(entry.done) : ''}
                </span>
                <div className="relative h-24 w-5 sm:w-6" title={`${entry.done} od ${entry.planned} km`}>
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-md border border-border bg-surface-elevated"
                    style={{ height: `${Math.max((entry.planned / stats.maxWeek) * 100, entry.planned > 0 ? 4 : 0)}%` }}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-md bg-chart-bar"
                    style={{ height: `${(entry.done / stats.maxWeek) * 100}%` }}
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
            planirano
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-chart-bar" />
            urađeno
          </span>
        </div>
        {stats.series.length > 0 && stats.series.every((entry) => entry.done === 0) ? (
          <p className="text-caption text-text-muted">
            Još nema urađenih treninga — kolone se pune kako beležiš treninge.
          </p>
        ) : (
          <p className="text-caption text-text-muted">Koliko si istrčao od planiranog — nedelja po nedelja.</p>
        )}
      </AppCard>

      <PredictorCard paces={paces} anchor={anchor} raceDistanceKm={plan.races?.distance_km ?? null} />
      <PersonalBestsCard logs={logs} />

      <div className="space-y-2">
        <SectionHeader label="Poslednje zabeleženo" />
        {logs.length === 0 ? (
          <EmptyState
            title="Prvi trening još čeka"
            description="Kad budeš spreman, zabeleži trening i brojevi se pune sami."
            icon={<History className="h-6 w-6" />}
          />
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 5).map((log) => (
              <ListRow
                key={log.id}
                eyebrow={formatDateShort(log.log_date)}
                title={log.distance_km ? `${log.distance_km} km` : 'Trening'}
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
    </div>
  );
}
