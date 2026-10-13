import { useState } from 'react';
import {
  defaultRecoveryRunDays,
  formatDuration,
  planRealignment,
  planWeekAdjustments,
  recentMissedCount,
  runWindowHours,
  scoreWindow,
  type RunWindow,
  type WorkoutStatus,
  type WorkoutType,
} from '@runcast/shared';
import { clsx } from 'clsx';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppLinkButton } from '@/components/ui/AppLinkButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/QueryError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { scoreDotClass } from '@/components/weather/weather-utils';
import { useActivePlan, useApplyWeekPlan, useGenerateRecoveryPlan, useWorkoutsRange } from '@/features/plans/queries';
import { useProfile } from '@/features/profile/queries';
import { useWeather } from '@/features/weather/queries';
import { TONE_DOT_CLASSES, typeTone, workoutDurationSec } from '@/features/workouts/utils';
import {
  addDaysIso,
  addMonthsIso,
  dayDiff,
  endOfWeekIso,
  firstDayOfMonth,
  formatMonth,
  lastDayOfMonth,
  startOfWeekIso,
  todayIso,
} from '@/lib/dates';
import { staggerProps } from '@/lib/motion';
import { workoutTitle } from '@/lib/workout-title';
import type { WorkoutsRow } from '@/types';

const DAY_KEYS = ['days.mon', 'days.tue', 'days.wed', 'days.thu', 'days.fri', 'days.sat', 'days.sun'];
const PHASES = ['BASE', 'BUILD', 'PEAK', 'TAPER', 'RACE'];

function dotClass(workout: WorkoutsRow): string {
  if (workout.status === 'DONE') return TONE_DOT_CLASSES.success;
  if (workout.status === 'SKIPPED') return TONE_DOT_CLASSES.danger;
  return TONE_DOT_CLASSES[typeTone(workout.type)];
}

function PlanSkeleton() {
  return (
    <div data-testid="plan-skeleton" className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-44" />
          </div>
          <div className="shrink-0 space-y-1.5">
            <Skeleton className="ml-auto h-3 w-20" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-3 w-52" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-20" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAY_KEYS.map((key) => (
            <Skeleton key={key} className="mx-auto h-3 w-6" />
          ))}
        </div>
        <div className="space-y-1">
          {Array.from({ length: 6 }, (_, row) => (
            <div key={row} className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }, (_, column) => (
                <Skeleton key={column} className="h-10 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
        <Skeleton className="h-3 w-44" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-1.5 w-full" />
        <div className="space-y-1.5">
          {Array.from({ length: 7 }, (_, row) => (
            <Skeleton key={row} className="h-[61px] w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekRow({
  workout,
  date,
  dayLabel,
  isToday,
}: {
  workout: WorkoutsRow | null;
  date: string;
  dayLabel: string;
  isToday: boolean;
}) {
  const { t } = useTranslation('plan');
  const isDone = workout?.status === 'DONE';
  const isSkipped = workout?.status === 'SKIPPED';
  const isRest = !workout || workout.type === 'REST';
  const barClass = workout && !isRest ? TONE_DOT_CLASSES[typeTone(workout.type)] : 'bg-transparent';
  const duration = workout ? workoutDurationSec(workout) : null;
  const meta = !workout
    ? t('week.free')
    : workout.type === 'REST'
      ? t('week.recovery')
      : [workout.distance_km > 0 ? `${workout.distance_km} km` : null, duration ? formatDuration(duration) : null]
          .filter(Boolean)
          .join(' · ');

  return (
    <Link
      to={workout ? `/workout/${workout.id}` : '/plan'}
      data-testid="week-row"
      data-date={date}
      data-type={workout?.type ?? ''}
      data-status={workout?.status ?? ''}
      className={clsx(
        'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99]',
        isToday
          ? 'border-primary/40 bg-primary-soft'
          : isRest
            ? 'border-transparent hover:bg-surface'
            : 'border-border bg-surface hover:border-primary/40',
      )}
    >
      <span className="flex w-9 shrink-0 flex-col items-center">
        <span className="section-label">{dayLabel}</span>
        <span className="num text-base font-semibold">{Number(date.slice(8, 10))}</span>
      </span>
      <span className={clsx('h-8 w-1 shrink-0 rounded-full', barClass, isSkipped && 'opacity-40')} aria-hidden />
      <span className="min-w-0 flex-1">
        <span
          className={clsx(
            'block truncate text-sm font-medium',
            isSkipped && 'text-text-muted line-through',
            isRest && 'text-text-muted',
          )}
        >
          {workout ? workoutTitle(t, workout) : t('week.none')}
        </span>
        <span className="num block truncate text-caption text-text-muted">{meta}</span>
      </span>
      {isDone ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success-ink" aria-hidden />
      ) : isSkipped ? (
        <XCircle className="h-4 w-4 shrink-0 text-danger-ink" aria-hidden />
      ) : null}
    </Link>
  );
}

export function PlanPage() {
  const { t } = useTranslation('plan');
  const reduceMotion = useReducedMotion();
  const today = todayIso();
  const [monthAnchor, setMonthAnchor] = useState(() => firstDayOfMonth(today));
  const gridStart = startOfWeekIso(monthAnchor);
  const gridEnd = endOfWeekIso(lastDayOfMonth(monthAnchor));
  const { data: plan, isLoading: planLoading, isError: planError, refetch } = useActivePlan();
  const {
    data: monthWorkouts = [],
    isLoading: monthLoading,
    isError: monthError,
    refetch: refetchMonth,
  } = useWorkoutsRange(gridStart, gridEnd);
  const { data: profile } = useProfile();
  const { data: weather, isLoading: weatherLoading } = useWeather();
  const { data: currentWeekWorkouts = [] } = useWorkoutsRange(startOfWeekIso(today), endOfWeekIso(today));
  const { data: planWorkouts = [] } = useWorkoutsRange(plan?.start_date ?? today, plan?.race_date ?? today);
  const applyWeekPlan = useApplyWeekPlan();
  const generateRecovery = useGenerateRecoveryPlan();
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [adaptError, setAdaptError] = useState<string | null>(null);
  const [adaptDone, setAdaptDone] = useState(false);
  const [realignDismissed, setRealignDismissed] = useState(false);
  const [realignNotice, setRealignNotice] = useState<'success' | 'already' | 'error' | null>(null);
  const [recoveryError, setRecoveryError] = useState(false);
  const [recoveryDone, setRecoveryDone] = useState(false);
  const runWindow: RunWindow = (profile?.run_window as RunWindow | undefined) ?? 'morning';
  const runHours = runWindowHours(runWindow);
  const weatherScores = new Map<string, number>();
  if (weather) {
    for (const date of new Set(weather.hours.map((hour) => hour.time.slice(0, 10)))) {
      const hasWindowHours = weather.hours.some((hour) => {
        const hourNumber = Number(hour.time.slice(11, 13));
        return hour.time.startsWith(date) && hourNumber >= runHours.startHour && hourNumber < runHours.endHour;
      });
      if (hasWindowHours) weatherScores.set(date, scoreWindow(weather.hours, weather.air, runHours, date).score);
    }
  }

  const weeks: string[][] = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDaysIso(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDaysIso(cursor, index)));
  }
  const month = monthAnchor.slice(0, 7);
  const isCurrentMonth = month === today.slice(0, 7);
  const listStart = startOfWeekIso(isCurrentMonth ? today : monthAnchor);
  const listEnd = endOfWeekIso(listStart);
  const weekDates = Array.from({ length: 7 }, (_, index) => addDaysIso(listStart, index));
  const weekWorkouts = monthWorkouts.filter(
    (workout) => workout.workout_date >= listStart && workout.workout_date <= listEnd,
  );
  const runs = weekWorkouts.filter((workout) => workout.type !== 'REST' && workout.type !== 'STRENGTH');
  const plannedKm = Math.round(runs.reduce((sum, workout) => sum + workout.distance_km, 0) * 10) / 10;
  const doneKm =
    Math.round(
      runs.filter((workout) => workout.status === 'DONE').reduce((sum, workout) => sum + workout.distance_km, 0) * 10,
    ) / 10;
  const currentPhase = weekWorkouts[0]?.phase ?? null;
  const missedWorkouts = currentWeekWorkouts.filter(
    (workout) => workout.status === 'PLANNED' && workout.type !== 'REST' && workout.workout_date < today,
  );

  if (planLoading || monthLoading) return <PlanSkeleton />;
  if (planError) return <QueryError onRetry={() => void refetch()} />;

  if (!plan) {
    return (
      <EmptyState
        title={t('empty.title')}
        description={t('empty.description')}
        icon={<CalendarDays className="h-6 w-6" />}
        action={
          <AppLinkButton to="/settings" size="sm">
            {t('empty.action')}
          </AppLinkButton>
        }
      />
    );
  }

  const daysToRace = dayDiff(today, plan.race_date);
  const planWeek = Math.min(Math.max(Math.floor(dayDiff(plan.start_date, today) / 7) + 1, 1), plan.weeks);
  const progressPct = Math.min(100, (planWeek / plan.weeks) * 100);
  const realignmentWorkouts = planWorkouts.map((workout) => ({
    id: workout.id,
    date: workout.workout_date,
    type: workout.type as WorkoutType,
    status: workout.status as WorkoutStatus,
  }));
  const realignment = planRealignment({
    workouts: realignmentWorkouts,
    today,
    longRunDay: plan.long_run_day,
    raceDate: plan.race_date,
  });
  const recentMissed = recentMissedCount(realignmentWorkouts, today);
  const racePassed = Boolean(plan.races && dayDiff(today, plan.races.race_date) < 0);
  const showRecovery = racePassed;
  const showRealign = recentMissed >= 3 && !realignDismissed && !showRecovery;
  const showAdapt = missedWorkouts.length > 0 && !showRealign;

  async function handleRealign() {
    const assignments = [
      ...realignment.moves.map((move) => ({ id: move.id, date: move.newDate })),
      ...realignment.skips.map((id) => ({ id, status: 'SKIPPED' as const })),
    ];
    if (assignments.length === 0) {
      setRealignNotice('already');
      setRealignDismissed(true);
      return;
    }
    try {
      setRealignNotice(null);
      await applyWeekPlan.mutateAsync(assignments);
      setRealignNotice('success');
      setRealignDismissed(true);
    } catch {
      setRealignNotice('error');
    }
  }

  async function handleRecovery() {
    if (!plan) return;
    try {
      setRecoveryError(false);
      await generateRecovery.mutateAsync({ startDate: today, runDays: defaultRecoveryRunDays(plan.days_per_week) });
      setRecoveryDone(true);
    } catch {
      setRecoveryError(true);
    }
  }

  async function handleAdapt() {
    if (!plan) return;
    try {
      setAdaptError(null);
      const { skips, moves } = planWeekAdjustments({
        workouts: currentWeekWorkouts.map((workout) => ({
          id: workout.id,
          date: workout.workout_date,
          type: workout.type as WorkoutType,
          status: workout.status as WorkoutStatus,
        })),
        today,
        longRunDay: plan.long_run_day,
        raceDate: plan.race_date,
      });
      await applyWeekPlan.mutateAsync([
        ...moves.map((move) => ({ id: move.id, date: move.newDate })),
        ...skips.map((id) => ({ id, status: 'SKIPPED' as const })),
      ]);
      setAdaptOpen(false);
      setAdaptDone(true);
    } catch {
      setAdaptError(t('adapt.error'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="section-label">{t('header.label')}</p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="num text-xl font-semibold">{t('header.week', { week: planWeek, weeks: plan.weeks })}</p>
              {showAdapt ? (
                <AppButton
                  size="sm"
                  variant="ghost"
                  className="w-auto"
                  data-testid="adapt-week"
                  onClick={() => setAdaptOpen(true)}
                >
                  {t('adapt.action')}
                </AppButton>
              ) : null}
            </div>
          </div>
          <p className="num shrink-0 text-right text-caption text-text-muted">
            {daysToRace >= 0 ? t('header.daysToRace', { days: daysToRace }) : t('header.racePassed')}
            <br />
            {t('header.daysPerWeek', { days: plan.days_per_week })}
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-caption">
          {PHASES.map((phase, index) => (
            <span key={phase} className="flex items-center gap-1.5">
              {index > 0 ? <span className="text-text-muted">→</span> : null}
              <span className={phase === currentPhase ? 'font-semibold text-primary-ink' : 'text-text-muted'}>
                {t(`phase.${phase.toLowerCase()}`)}
              </span>
            </span>
          ))}
        </div>
        {adaptDone ? (
          <p data-testid="adapt-success" className="text-caption text-success-ink">
            {t('adapt.success')}
          </p>
        ) : null}
        {realignNotice ? (
          <p
            data-testid="realign-notice"
            className={clsx('text-caption', realignNotice === 'error' ? 'text-danger-ink' : 'text-success-ink')}
          >
            {t(`realign.${realignNotice}`)}
          </p>
        ) : null}
        {recoveryDone ? (
          <p data-testid="recovery-notice" className="text-caption text-success-ink">
            {t('recovery.success')}
          </p>
        ) : null}
      </div>

      {showRealign ? (
        <AppCard
          data-testid="realign-card"
          className="space-y-3 border-primary/40 bg-gradient-to-b from-primary-soft to-transparent"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('realign.title')}</p>
            <p className="text-sm text-text-secondary">
              {t('realign.summary', { missed: recentMissed, moves: realignment.moves.length })}
            </p>
          </div>
          <div className="flex gap-3">
            <AppButton
              className="flex-1"
              loading={applyWeekPlan.isPending}
              data-testid="realign-apply"
              onClick={() => void handleRealign()}
            >
              {t('realign.confirm')}
            </AppButton>
            <AppButton
              className="flex-1"
              variant="secondary"
              data-testid="realign-dismiss"
              onClick={() => setRealignDismissed(true)}
            >
              {t('realign.keep')}
            </AppButton>
          </div>
        </AppCard>
      ) : null}

      {showRecovery ? (
        <AppCard
          data-testid="recovery-card"
          className="space-y-3 border-primary/40 bg-gradient-to-b from-primary-soft to-transparent"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('recovery.title')}</p>
            <p className="text-sm text-text-secondary">{t('recovery.description')}</p>
            <p className="text-caption text-text-muted">{t('recovery.warning')}</p>
          </div>
          <div className="flex gap-3">
            <AppButton
              className="flex-1"
              loading={generateRecovery.isPending}
              data-testid="recovery-generate"
              onClick={() => void handleRecovery()}
            >
              {t('recovery.action')}
            </AppButton>
          </div>
          {recoveryError ? <p className="text-caption text-danger-ink">{t('recovery.error')}</p> : null}
        </AppCard>
      ) : null}

      <div className="space-y-3">
        <SectionHeader
          label={t('month.title')}
          action={
            <div className="flex items-center gap-1">
              <AppButton
                size="sm"
                variant="ghost"
                aria-label={t('month.previous')}
                onClick={() => setMonthAnchor((current) => addMonthsIso(current, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </AppButton>
              <p className="num min-w-24 text-center text-sm font-semibold capitalize">{formatMonth(monthAnchor)}</p>
              <AppButton
                size="sm"
                variant="ghost"
                aria-label={t('month.next')}
                onClick={() => setMonthAnchor((current) => addMonthsIso(current, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </AppButton>
            </div>
          }
        />
        {!isCurrentMonth ? (
          <button
            type="button"
            onClick={() => setMonthAnchor(firstDayOfMonth(today))}
            className="rounded-lg bg-surface-elevated px-2.5 py-1.5 text-caption font-medium text-text-secondary transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {t('month.today')}
          </button>
        ) : null}
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAY_KEYS.map((key) => (
            <span key={key} className="section-label">
              {t(key)}
            </span>
          ))}
        </div>
        <div className="space-y-1">
          {monthError ? (
            <QueryError onRetry={() => void refetchMonth()} />
          ) : (
            weeks.map((week) => (
              <div key={week[0]} className="grid grid-cols-7 gap-1">
                {week.map((date) => {
                  const workout = monthWorkouts.find((item) => item.workout_date === date);
                  const score = weatherScores.get(date);
                  const inMonth = date.slice(0, 7) === month;
                  const isToday = date === today;
                  const cellAttrs = {
                    'data-testid': 'cal-cell',
                    'data-date': date,
                    'data-type': workout?.type ?? '',
                    'data-status': workout?.status ?? '',
                    ...(score !== undefined ? { 'data-score': String(score) } : {}),
                  };
                  const cell = (
                    <div
                      className={clsx(
                        'relative flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg',
                        isToday
                          ? 'bg-primary-soft ring-1 ring-inset ring-primary/60'
                          : workout
                            ? 'bg-surface-elevated'
                            : 'bg-transparent',
                        inMonth ? '' : 'opacity-40',
                      )}
                    >
                      <span
                        className={clsx(
                          'num text-xs',
                          isToday ? 'font-bold text-primary-ink' : 'font-medium text-text-secondary',
                        )}
                      >
                        {Number(date.slice(8, 10))}
                      </span>
                      <span
                        className={clsx('h-1.5 w-1.5 rounded-full', workout ? dotClass(workout) : 'bg-transparent')}
                      />
                      {score !== undefined ? (
                        <span
                          aria-hidden
                          className={clsx('absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full', scoreDotClass(score))}
                        />
                      ) : weatherLoading ? (
                        <span
                          aria-hidden
                          className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-text-muted/30"
                        />
                      ) : null}
                    </div>
                  );
                  return workout ? (
                    <Link
                      key={date}
                      to={`/workout/${workout.id}`}
                      aria-label={`${date}: ${workoutTitle(t, workout)}`}
                      {...cellAttrs}
                    >
                      {cell}
                    </Link>
                  ) : (
                    <div key={date} {...cellAttrs}>
                      {cell}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        {weatherScores.size > 0 ? (
          <p data-testid="plan-weather-legend" className="flex items-center gap-1.5 text-caption text-text-muted">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success-ink" />
            {t('weather.legend')}
          </p>
        ) : weatherLoading ? (
          <p
            data-testid="plan-weather-legend"
            className="flex items-center gap-1.5 text-caption text-text-muted opacity-60"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-text-muted/30" />
            {t('weather.legend')}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <SectionHeader
          label={t(isCurrentMonth ? 'week.current' : 'week.first')}
          action={
            <span className="num text-caption text-text-muted">
              {doneKm} / {plannedKm} km
            </span>
          }
        />
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${plannedKm > 0 ? Math.min(100, (doneKm / plannedKm) * 100) : 0}%` }}
          />
        </div>
        <div className="space-y-1.5">
          {weekDates.map((date, index) => (
            <motion.div key={date} {...staggerProps(index, reduceMotion)}>
              <WeekRow
                workout={weekWorkouts.find((workout) => workout.workout_date === date) ?? null}
                date={date}
                dayLabel={t(DAY_KEYS[index])}
                isToday={date === today}
              />
            </motion.div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={adaptOpen}
        title={t('adapt.title')}
        description={t('adapt.confirm', { count: missedWorkouts.length })}
        confirmLabel={t('adapt.action')}
        loading={applyWeekPlan.isPending}
        error={adaptError ?? undefined}
        onConfirm={() => void handleAdapt()}
        onClose={() => {
          setAdaptOpen(false);
          setAdaptError(null);
        }}
      />
    </div>
  );
}
