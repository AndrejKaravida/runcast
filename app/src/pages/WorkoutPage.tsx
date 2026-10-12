import { useState } from 'react';
import { formatDuration, formatPace, runWindowHours, type RunWindow } from '@runcast/shared';
import { ArrowLeft, CheckCircle2, SkipForward } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { WeatherSummaryCard } from '@/components/weather/WeatherSummaryCard';
import { LogWorkoutModal } from '@/components/workouts/LogWorkoutModal';
import { PaceZoneBadge } from '@/components/workouts/PaceZoneBadge';
import { useRunLogs, useSkipWorkout } from '@/features/logs/queries';
import { useWorkout } from '@/features/plans/queries';
import { useProfile } from '@/features/profile/queries';
import { useWeather } from '@/features/weather/queries';
import { statusTone, typeLabel, workoutSteps } from '@/features/workouts/utils';
import { formatDateLong, todayIso } from '@/lib/dates';

export function WorkoutPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const today = todayIso();
  const { data: workout, isLoading } = useWorkout(id);
  const { data: profile } = useProfile();
  const { data: logs = [] } = useRunLogs();
  const weather = useWeather();
  const skipWorkout = useSkipWorkout();
  const [logOpen, setLogOpen] = useState(false);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);

  const runWindow: RunWindow = (profile?.run_window as RunWindow | undefined) ?? 'morning';
  const window = runWindowHours(runWindow);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[560px] space-y-3 px-4 py-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 py-6">
        <EmptyState
          title="Trening nije nađen"
          description="Možda je plan regenerisan."
          action={
            <Link to="/plan">
              <AppButton size="sm" variant="secondary">
                Nazad na plan
              </AppButton>
            </Link>
          }
        />
      </div>
    );
  }

  const steps = workoutSteps(workout);
  const log = logs.find((entry) => entry.workout_id === workout.id) ?? null;
  const showWeather = workout.workout_date >= today && workout.type !== 'REST';

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-4 px-4 py-6">
      <AppButton variant="ghost" size="sm" className="-ml-2 w-auto" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> Nazad
      </AppButton>

      <AppCard className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {formatDateLong(workout.workout_date)}
        </p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold">{workout.title}</h1>
          <PaceZoneBadge zone={workout.pace_zone} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AppBadge tone="neutral">{typeLabel(workout.type)}</AppBadge>
          <AppBadge tone={statusTone(workout.status)}>
            {workout.status === 'DONE' ? 'Urađeno' : workout.status === 'SKIPPED' ? 'Preskočeno' : 'Planirano'}
          </AppBadge>
          <AppBadge tone="neutral">Faza: {workout.phase}</AppBadge>
          {workout.distance_km > 0 ? <AppBadge tone="neutral">{workout.distance_km} km</AppBadge> : null}
        </div>
      </AppCard>

      {steps.length > 0 ? (
        <AppCard className="space-y-2">
          <p className="text-sm font-semibold">Koraci</p>
          <ul className="divide-y divide-border">
            {steps.map((step, index) => (
              <li key={`${step.label}-${index}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{step.label}</span>
                {step.pace ? <span className="shrink-0 text-text-muted">{step.pace} /km</span> : null}
              </li>
            ))}
          </ul>
        </AppCard>
      ) : null}

      {log ? (
        <AppCard className="space-y-2">
          <p className="text-sm font-semibold">Zabeleženo</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {log.distance_km ? <AppBadge tone="neutral">{log.distance_km} km</AppBadge> : null}
            {log.duration_sec ? <AppBadge tone="neutral">{formatDuration(log.duration_sec)}</AppBadge> : null}
            {log.avg_pace_sec_per_km ? (
              <AppBadge tone="rain">{formatPace(log.avg_pace_sec_per_km)} /km</AppBadge>
            ) : null}
            {log.rpe ? <AppBadge tone="primary">RPE {log.rpe}</AppBadge> : null}
          </div>
          {log.notes ? <p className="text-sm text-text-secondary">{log.notes}</p> : null}
        </AppCard>
      ) : null}

      {showWeather ? (
        <WeatherSummaryCard
          data={weather.data}
          isError={weather.isError}
          date={workout.workout_date}
          windowStartHour={window.startHour}
          windowEndHour={window.endHour}
          updatedAt={weather.dataUpdatedAt || null}
          loading={weather.isLoading}
          onRefresh={() => void weather.refetch()}
        />
      ) : null}

      {workout.status === 'PLANNED' && workout.type !== 'REST' ? (
        <div className="flex gap-3">
          <AppButton className="flex-1" onClick={() => setLogOpen(true)}>
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Urađeno
          </AppButton>
          <AppButton variant="ghost" className="flex-1" onClick={() => setSkipConfirmOpen(true)}>
            <SkipForward className="h-4 w-4" aria-hidden /> Preskoči
          </AppButton>
        </div>
      ) : null}

      <LogWorkoutModal workout={workout} open={logOpen} onClose={() => setLogOpen(false)} />
      <ConfirmDialog
        open={skipConfirmOpen}
        title="Preskoči trening?"
        description="Trening će biti označen kao preskočen i neće ulaziti u realizaciju plana."
        confirmLabel="Preskoči"
        tone="danger"
        loading={skipWorkout.isPending}
        onConfirm={() => {
          void skipWorkout.mutateAsync(workout.id).then(() => setSkipConfirmOpen(false));
        }}
        onClose={() => setSkipConfirmOpen(false)}
      />
    </div>
  );
}
