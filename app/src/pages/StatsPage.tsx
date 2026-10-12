import { useMemo } from 'react';
import { formatDuration, formatPace, type PlanAnchor, type PlanPaces } from '@runcast/shared';
import { Link } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/QueryError';
import { Skeleton } from '@/components/ui/Skeleton';
import { CoachInsightsCard } from '@/components/workouts/CoachInsightsCard';
import { PersonalBestsCard } from '@/components/workouts/PersonalBestsCard';
import { PredictorCard } from '@/components/workouts/PredictorCard';
import { useRunLogs } from '@/features/logs/queries';
import { adherencePct, loggedKm, runStreak, weeklyKmSeries } from '@/features/plans/progress';
import { useActivePlan, useWorkoutsRange } from '@/features/plans/queries';
import { dayDiff, formatDateShort, todayIso } from '@/lib/dates';

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
    return {
      doneKm: loggedKm(logs),
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
        title="Nema podataka"
        description="Napravi plan pa će statistika da se puni kako trčiš."
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
  const tiles = [
    { label: 'Pređeno', value: `${stats.doneKm} km` },
    { label: 'Realizacija', value: `${stats.completion}%` },
    { label: 'Niz dana', value: `${stats.streak} d` },
    { label: 'Do trke', value: daysToRace >= 0 ? `${daysToRace} d` : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <AppCard key={tile.label} className="p-3">
            <p className="text-xs font-medium text-text-muted">{tile.label}</p>
            <p className="mt-1 text-xl font-bold">{tile.value}</p>
          </AppCard>
        ))}
      </div>

      <CoachInsightsCard workouts={workouts} logs={logs} today={today} raceDate={plan.race_date} />

      <PredictorCard paces={paces} anchor={anchor} raceDistanceKm={plan.races?.distance_km ?? null} />
      <PersonalBestsCard logs={logs} />

      <AppCard className="space-y-3">
        <p className="text-sm font-semibold">Nedeljni kilometri</p>
        <div className="flex h-32 items-end gap-2">
          {stats.series.map((entry) => (
            <div key={entry.week} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-text-muted" title={`${entry.done} od ${entry.planned} km`}>
                {Math.round(entry.done)}
              </span>
              <div className="relative h-full w-full overflow-hidden rounded-t-lg bg-surface-elevated">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-lg bg-primary/80"
                  style={{ height: `${Math.max((entry.done / stats.maxWeek) * 100, entry.done > 0 ? 6 : 0)}%` }}
                />
              </div>
              <span className="text-[10px] text-text-muted">
                {entry.week.slice(8, 10)}.{entry.week.slice(5, 7)}.
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-text-muted">Urađeno / planirano po nedeljama (do danas).</p>
      </AppCard>

      <AppCard className="space-y-2">
        <p className="text-sm font-semibold">Poslednje zabeleženo</p>
        {logs.length === 0 ? (
          <p className="text-sm text-text-muted">Još nema zabeleženih treninga.</p>
        ) : (
          <ul className="divide-y divide-border">
            {logs.slice(0, 5).map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-text-secondary">{formatDateShort(log.log_date)}</span>
                <span className="flex flex-wrap items-center justify-end gap-2">
                  {log.distance_km ? <AppBadge tone="neutral">{log.distance_km} km</AppBadge> : null}
                  {log.avg_pace_sec_per_km ? (
                    <span className="text-text-muted">{formatPace(log.avg_pace_sec_per_km)} /km</span>
                  ) : null}
                  {log.duration_sec ? (
                    <span className="text-text-muted">{formatDuration(log.duration_sec)}</span>
                  ) : null}
                  {log.rpe ? <AppBadge tone="primary">RPE {log.rpe}</AppBadge> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AppCard>
    </div>
  );
}
