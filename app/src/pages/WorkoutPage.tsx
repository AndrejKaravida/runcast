import { useState } from 'react';
import {
  buildFuelingPlan,
  buildStepTimeline,
  describeWorkout,
  formatDuration,
  formatPace,
  isGuidedRunType,
  normalizeStepLabel,
  runWindowHours,
  type PaceZone,
  type PlanPhase,
  type RunWindow,
  type WorkoutType,
} from '@runcast/shared';
import { clsx } from 'clsx';
import { ArrowLeft, CalendarClock, CalendarPlus, CheckCircle2, SkipForward } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppLinkButton } from '@/components/ui/AppLinkButton';
import { AppModal } from '@/components/ui/AppModal';
import { buttonClassName } from '@/components/ui/button-styles';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/QueryError';
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
import { planPaces } from '@/features/plans/plan-data';
import { useActivePlan, useMoveWorkout, useWorkout } from '@/features/plans/queries';
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
import { addDaysIso, dayDiff, formatDateLong, todayIso } from '@/lib/dates';

export function WorkoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const today = todayIso();
  const { data: workout, isLoading, isError, refetch } = useWorkout(id);
  const { data: plan } = useActivePlan();
  const { data: profile } = useProfile();
  const { data: logs = [] } = useRunLogs();
  const weather = useWeather();
  const skipWorkout = useSkipWorkout();
  const completeWorkout = useCompleteWorkout();
  const moveWorkout = useMoveWorkout();
  const [logOpen, setLogOpen] = useState(false);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveDate, setMoveDate] = useState(() => addDaysIso(today, 1));
  const [moveError, setMoveError] = useState<string | null>(null);

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

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 py-6">
        <QueryError onRetry={() => void refetch()} />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 py-6">
        <EmptyState
          title={t('workout:missing.title')}
          description={t('workout:missing.description')}
          action={
            <AppLinkButton to="/plan" size="sm" variant="secondary">
              {t('workout:missing.action')}
            </AppLinkButton>
          }
        />
      </div>
    );
  }

  const steps = workoutSteps(workout);
  const log = logs.find((entry) => entry.workout_id === workout.id) ?? null;
  const isStrength = workout.type === 'STRENGTH';
  const paces = planPaces(plan);
  const googleCalendarUrl = buildGoogleCalendarUrlForWorkout(workout, {
    runWindow,
    paces,
  });
  const showWeather = workout.workout_date >= today && workout.type !== 'REST' && !isStrength;
  const explanation = describeWorkout(
    {
      type: workout.type as WorkoutType,
      phase: workout.phase as PlanPhase,
      paceZone: workout.pace_zone as PaceZone | null,
      distanceKm: workout.distance_km,
    },
    { paces },
  );
  const stats = heroStats(t, workout, paces);
  const planWeek = plan ? Math.min(Math.floor(dayDiff(plan.start_date, today) / 7) + 1, plan.weeks) : null;
  const planWeekLabel = plan && planWeek ? ` · ${t('workout:meta.week', { week: planWeek, weeks: plan.weeks })}` : '';
  const totalDuration = workoutDurationSec(workout);
  const canAct = workout.status === 'PLANNED' && workout.type !== 'REST';
  const canMove = workout.status === 'PLANNED' && workout.type !== 'RACE';
  const fuelingTimeline = buildStepTimeline(
    {
      type: workout.type,
      paceZone: workout.pace_zone,
      distanceKm: workout.distance_km,
      steps,
    },
    paces,
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

  async function handleComplete() {
    if (!workout) return;
    try {
      setCompleteError(null);
      await completeWorkout.mutateAsync(workout.id);
    } catch {
      setCompleteError(t('workout:actions.error'));
    }
  }

  async function handleSkip() {
    if (!workout) return;
    try {
      setSkipError(null);
      await skipWorkout.mutateAsync(workout.id);
      setSkipConfirmOpen(false);
    } catch {
      setSkipError(t('workout:skip.error'));
    }
  }

  function openMove() {
    setMoveError(null);
    const next = addDaysIso(today, 1);
    setMoveDate(plan && next > plan.race_date ? plan.race_date : next);
    setMoveOpen(true);
  }

  function closeMove() {
    setMoveOpen(false);
    setMoveError(null);
  }

  async function handleMove() {
    if (!workout || !moveDate) return;
    try {
      setMoveError(null);
      const moved = await moveWorkout.mutateAsync({ workout, date: moveDate });
      if (!moved) {
        setMoveError(t('workout:move.missing'));
        return;
      }
      setMoveOpen(false);
    } catch {
      setMoveError(t('workout:move.error'));
    }
  }

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <AppButton variant="ghost" size="sm" className="-ml-2 w-auto" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> {t('common:actions.back')}
        </AppButton>
        <div className="flex items-center gap-1">
          {googleCalendarUrl ? (
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="add-google"
              aria-label={t('workout:actions.googleCalendar')}
              className={buttonClassName('ghost', 'sm', 'w-auto')}
            >
              <CalendarPlus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t('workout:actions.googleCalendar')}</span>
            </a>
          ) : null}
          {canMove ? (
            <AppButton
              variant="ghost"
              size="sm"
              className="w-auto"
              aria-label={t('workout:move.action')}
              data-testid="move-workout"
              onClick={openMove}
            >
              <CalendarClock className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t('workout:move.action')}</span>
            </AppButton>
          ) : null}
          {canAct ? (
            <AppButton variant="ghost" size="sm" className="-mr-2 w-auto" onClick={() => setSkipConfirmOpen(true)}>
              <SkipForward className="h-4 w-4" aria-hidden /> {t('workout:actions.skip')}
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
              {workout.status === 'DONE' ? t('common:status.done') : t('common:status.skipped')}
            </AppBadge>
          ) : null}
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-display">{workout.title}</h1>
          <PaceZoneBadge zone={workout.pace_zone} />
        </div>
        <p className="text-sm text-text-secondary">
          {typeLabel(t, workout.type)} · {t('workout:meta.phase', { phase: phaseLabel(t, workout.phase) })}
          {planWeekLabel}
        </p>
        {stats.length >= 2 ? (
          <StatRow items={stats} className="rounded-2xl border border-border bg-surface py-1" />
        ) : null}
      </header>

      {steps.length > 0 ? (
        <section className="space-y-1">
          <SectionHeader
            label={t('workout:steps.title')}
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
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{normalizeStepLabel(step.label)}</span>
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
          <SectionHeader label={t('workout:logged.title')} />
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
              onClick={() => void handleComplete()}
            >
              <CheckCircle2 className="h-5 w-5" aria-hidden /> {t('workout:actions.completeStrength')}
            </AppButton>
          ) : (
            <AppButton size="lg" className="w-full" onClick={() => setLogOpen(true)}>
              <CheckCircle2 className="h-5 w-5" aria-hidden /> {t('workout:actions.done')}
            </AppButton>
          )}
          {completeError ? <p className="text-caption text-danger-ink">{completeError}</p> : null}
          {!isStrength && isGuidedRunType(workout.type) && steps.length > 0 ? (
            <AppLinkButton
              to={`/run/${workout.id}`}
              variant="secondary"
              size="lg"
              className="w-full"
              data-testid="start-guided"
            >
              {t('workout:actions.guided')}
            </AppLinkButton>
          ) : null}
        </div>
      ) : null}

      {workout.type === 'RACE' ? (
        <AppLinkButton to="/race-day" variant="secondary" size="lg" className="w-full" data-testid="race-day-link">
          {t('workout:actions.raceDay')}
        </AppLinkButton>
      ) : null}

      <LogWorkoutModal workout={workout} open={logOpen} onClose={() => setLogOpen(false)} />
      <AppModal open={moveOpen} onClose={closeMove} title={t('workout:move.title')}>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">{t('workout:move.description')}</p>
          <AppInput
            label={t('workout:move.date')}
            type="date"
            min={today}
            max={plan?.race_date}
            value={moveDate}
            onChange={(event) => setMoveDate(event.target.value)}
          />
          {moveError ? <p className="text-sm text-danger-ink">{moveError}</p> : null}
          <div className="flex gap-3">
            <AppButton variant="secondary" className="flex-1" onClick={closeMove}>
              {t('common:actions.cancel')}
            </AppButton>
            <AppButton
              className="flex-1"
              loading={moveWorkout.isPending}
              data-testid="move-confirm"
              onClick={() => void handleMove()}
            >
              {t('workout:move.confirm')}
            </AppButton>
          </div>
        </div>
      </AppModal>
      <ConfirmDialog
        open={skipConfirmOpen}
        title={t('workout:skip.title')}
        description={t('workout:skip.description')}
        confirmLabel={t('workout:actions.skip')}
        tone="danger"
        loading={skipWorkout.isPending}
        error={skipError ?? undefined}
        onConfirm={() => void handleSkip()}
        onClose={() => {
          setSkipConfirmOpen(false);
          setSkipError(null);
        }}
      />
    </div>
  );
}
