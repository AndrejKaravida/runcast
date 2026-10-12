import { useState } from 'react';
import {
  buildFuelingPlan,
  buildStepTimeline,
  describeWorkout,
  formatDuration,
  formatPace,
  isGuidedRunType,
  runWindowHours,
  type PaceZone,
  type PlanPaces,
  type PlanPhase,
  type RunWindow,
  type WorkoutType,
} from '@runcast/shared';
import { clsx } from 'clsx';
import { ArrowLeft, CalendarPlus, CheckCircle2, SkipForward } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatRow } from '@/components/ui/StatRow';
import { WeatherSummaryCard } from '@/components/weather/WeatherSummaryCard';
import { FuelingCard } from '@/components/workouts/FuelingCard';
import { LogWorkoutModal } from '@/components/workouts/LogWorkoutModal';
import { PaceZoneBadge } from '@/components/workouts/PaceZoneBadge';
import { WhyCard } from '@/components/workouts/WhyCard';
import { WorkoutTypeIcon } from '@/components/workouts/WorkoutTypeIcon';
import { useCompleteWorkout, useRunLogs, useSkipWorkout } from '@/features/logs/queries';
import { buildGoogleCalendarUrlForWorkout } from '@/features/plans/export';
import { useActivePlan, useWorkout } from '@/features/plans/queries';
import { useProfile } from '@/features/profile/queries';
import { useWeather } from '@/features/weather/queries';
import {
  heroStats,
  phaseLabel,
  statusTone,
  TONE_TEXT_CLASSES,
  typeLabel,
  typeTone,
  workoutDurationSec,
  workoutSteps,
} from '@/features/workouts/utils';
import { dayDiff, formatDateLong, todayIso } from '@/lib/dates';

export function WorkoutPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const today = todayIso();
  const { data: workout, isLoading } = useWorkout(id);
  const { data: plan } = useActivePlan();
  const { data: profile } = useProfile();
  const { data: logs = [] } = useRunLogs();
  const weather = useWeather();
  const skipWorkout = useSkipWorkout();
  const completeWorkout = useCompleteWorkout();
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
          title="Ne nalazim ovaj trening"
          description="Plan je verovatno osvežen — pogledaj kalendar."
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
  const isStrength = workout.type === 'STRENGTH';
  const googleCalendarUrl = buildGoogleCalendarUrlForWorkout(workout, {
    runWindow,
    paces: (plan?.paces ?? null) as unknown as PlanPaces | null,
  });
  const showWeather = workout.workout_date >= today && workout.type !== 'REST' && !isStrength;
  const explanation = describeWorkout(
    {
      type: workout.type as WorkoutType,
      phase: workout.phase as PlanPhase,
      paceZone: workout.pace_zone as PaceZone | null,
      distanceKm: workout.distance_km,
    },
    { paces: (plan?.paces ?? null) as unknown as PlanPaces | null },
  );
  const stats = heroStats(workout, (plan?.paces ?? null) as unknown as PlanPaces | null);
  const planWeek = plan ? Math.min(Math.floor(dayDiff(plan.start_date, today) / 7) + 1, plan.weeks) : null;
  const planWeekLabel = plan && planWeek ? ` · Nedelja ${planWeek}/${plan.weeks}` : '';
  const totalDuration = workoutDurationSec(workout);
  const canAct = workout.status === 'PLANNED' && workout.type !== 'REST';
  const fuelingTimeline = buildStepTimeline(
    {
      type: workout.type,
      paceZone: workout.pace_zone,
      distanceKm: workout.distance_km,
      steps,
    },
    (plan?.paces ?? null) as unknown as PlanPaces | null,
  );
  const apparentC = showWeather
    ? (weather.data?.hours ?? [])
        .filter((hour) => {
          const hourNumber = Number(hour.time.slice(11, 13));
          return (
            hour.time.startsWith(workout.workout_date) && hourNumber >= window.startHour && hourNumber < window.endHour
          );
        })
        .reduce<number | null>((max, hour) => (max === null || hour.apparentC > max ? hour.apparentC : max), null)
    : null;
  const fuelingPlan = buildFuelingPlan({
    type: workout.type,
    durationSec: fuelingTimeline.totalDurationSec,
    distanceKm: workout.distance_km,
    paceSecPerKm: fuelingTimeline.segments[0]?.paceSecPerKm,
  });

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <AppButton variant="ghost" size="sm" className="-ml-2 w-auto" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Nazad
        </AppButton>
        <div className="flex items-center gap-1">
          {googleCalendarUrl ? (
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="add-google"
              aria-label="Dodaj u Google kalendar"
              className="block"
            >
              <AppButton variant="ghost" size="sm" className="w-auto">
                <CalendarPlus className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Dodaj u Google kalendar</span>
              </AppButton>
            </a>
          ) : null}
          {canAct ? (
            <AppButton variant="ghost" size="sm" className="-mr-2 w-auto" onClick={() => setSkipConfirmOpen(true)}>
              <SkipForward className="h-4 w-4" aria-hidden /> Preskoči
            </AppButton>
          ) : null}
        </div>
      </div>

      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="section-label flex min-w-0 items-center gap-1.5">
            <WorkoutTypeIcon
              type={workout.type}
              className={clsx('h-4 w-4 shrink-0', TONE_TEXT_CLASSES[typeTone(workout.type)])}
            />
            <span className="truncate">{formatDateLong(workout.workout_date)}</span>
          </p>
          {workout.status !== 'PLANNED' ? (
            <AppBadge tone={statusTone(workout.status)}>
              {workout.status === 'DONE' ? 'Urađeno' : 'Preskočeno'}
            </AppBadge>
          ) : null}
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-display">{workout.title}</h1>
          <PaceZoneBadge zone={workout.pace_zone} />
        </div>
        <p className="text-sm text-text-secondary">
          {typeLabel(workout.type)} · Faza {phaseLabel(workout.phase)}
          {planWeekLabel}
        </p>
        {stats.length >= 2 ? (
          <StatRow items={stats} className="rounded-2xl border border-border bg-surface py-1" />
        ) : null}
      </header>

      {steps.length > 0 ? (
        <section className="space-y-1">
          <SectionHeader
            label="Koraci"
            action={
              totalDuration ? (
                <span className="num text-caption text-text-muted">{formatDuration(totalDuration)}</span>
              ) : null
            }
          />
          <ol className="divide-y divide-border">
            {steps.map((step, index) => (
              <li key={`${step.label}-${index}`} className="flex items-center gap-3 py-3">
                <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-caption text-text-muted">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{step.label}</span>
                <span className="num shrink-0 text-sm text-text-secondary">
                  {step.pace
                    ? `${step.pace} /km`
                    : step.durationSec
                      ? formatDuration(step.durationSec)
                      : step.distanceKm
                        ? `${step.distanceKm} km`
                        : ''}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <WhyCard explanation={explanation} />

      {log ? (
        <AppCard className="space-y-2 border-l-2 border-l-success-ink">
          <SectionHeader label="Zabeleženo" />
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

      {fuelingPlan ? <FuelingCard plan={fuelingPlan} apparentC={apparentC} runWindow={runWindow} /> : null}

      {canAct ? (
        <div className="space-y-2">
          {isStrength ? (
            <AppButton
              size="lg"
              className="w-full"
              loading={completeWorkout.isPending}
              data-testid="complete-strength"
              onClick={() => void completeWorkout.mutateAsync(workout.id)}
            >
              <CheckCircle2 className="h-5 w-5" aria-hidden /> Završi trening
            </AppButton>
          ) : (
            <AppButton size="lg" className="w-full" onClick={() => setLogOpen(true)}>
              <CheckCircle2 className="h-5 w-5" aria-hidden /> Urađeno
            </AppButton>
          )}
          {!isStrength && isGuidedRunType(workout.type) && steps.length > 0 ? (
            <Link to={`/run/${workout.id}`} className="block" data-testid="start-guided">
              <AppButton variant="secondary" size="lg" className="w-full">
                Vođeno trčanje
              </AppButton>
            </Link>
          ) : null}
        </div>
      ) : null}

      {workout.type === 'RACE' ? (
        <Link to="/race-day" className="block" data-testid="race-day-link">
          <AppButton variant="secondary" size="lg" className="w-full">
            Strategija za dan trke
          </AppButton>
        </Link>
      ) : null}

      <LogWorkoutModal workout={workout} open={logOpen} onClose={() => setLogOpen(false)} />
      <ConfirmDialog
        open={skipConfirmOpen}
        title="Preskoči trening?"
        description="Označićemo ga kao preskočen. Ne utiče na realizaciju plana."
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
