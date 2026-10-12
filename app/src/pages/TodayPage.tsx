import { useMemo, useState } from 'react';
import {
  assessWorkoutWeather,
  formatDuration,
  isGuidedRunType,
  pickSwapCandidate,
  runWindowHours,
  type PlanPaces,
  type RunWindow,
  type WorkoutStatus,
  type WorkoutType,
} from '@runcast/shared';
import { clsx } from 'clsx';
import { ArrowRight, CalendarDays, CheckCircle2, Flame } from 'lucide-react';
import { Link } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { QueryError } from '@/components/ui/QueryError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatRow } from '@/components/ui/StatRow';
import { WeatherSummaryCard } from '@/components/weather/WeatherSummaryCard';
import { assessmentText } from '@/components/weather/weather-utils';
import { LogWorkoutModal } from '@/components/workouts/LogWorkoutModal';
import { NextWorkoutCard } from '@/components/workouts/NextWorkoutCard';
import { PaceZoneBadge } from '@/components/workouts/PaceZoneBadge';
import { RecentActivityCard } from '@/components/workouts/RecentActivityCard';
import { WeekStrip } from '@/components/workouts/WeekStrip';
import { WorkoutTypeIcon } from '@/components/workouts/WorkoutTypeIcon';
import { useCompleteWorkout, useRunLogs } from '@/features/logs/queries';
import { nextWorkout, runStreak, weekProgress } from '@/features/plans/progress';
import { useActivePlan, useSwapWorkouts, useWorkoutsRange } from '@/features/plans/queries';
import { useProfile } from '@/features/profile/queries';
import { useWeather } from '@/features/weather/queries';
import {
  heroStats,
  phaseBarClass,
  statusTone,
  TONE_TEXT_CLASSES,
  typeLabel,
  typeTone,
  workoutSteps,
} from '@/features/workouts/utils';
import {
  addDaysIso,
  dayDiff,
  endOfWeekIso,
  formatDateLong,
  formatDateShort,
  startOfWeekIso,
  todayIso,
} from '@/lib/dates';

const verdictToneClasses = {
  rain: 'border-rain-ink bg-rain-soft',
  warning: 'border-warning-ink bg-warning-soft',
  danger: 'border-danger-ink bg-danger-soft',
} as const;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Dobro jutro';
  if (hour < 18) return 'Dobar dan';
  return 'Dobro veče';
}

function streakClasses(streak: number): string {
  if (streak >= 7) return 'bg-warning-soft text-warning-ink';
  if (streak >= 3) return 'bg-primary-soft text-primary-ink';
  return 'bg-surface-elevated text-text-muted';
}

export function TodayPage() {
  const { data: profile } = useProfile();
  const { data: plan, isLoading: planLoading, isError: planError, refetch: refetchPlan } = useActivePlan();
  const today = todayIso();
  const { data: weekWorkouts = [], isLoading: workoutsLoading } = useWorkoutsRange(
    startOfWeekIso(today),
    endOfWeekIso(today),
  );
  const { data: planWorkouts = [] } = useWorkoutsRange(plan?.start_date ?? today, plan?.race_date ?? today);
  const { data: logs = [] } = useRunLogs();
  const weather = useWeather();
  const swapWorkouts = useSwapWorkouts();
  const completeWorkout = useCompleteWorkout();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const todayWorkout = weekWorkouts.find((workout) => workout.workout_date === today) ?? null;
  const runWindow: RunWindow = (profile?.run_window as RunWindow | undefined) ?? 'morning';
  const window = runWindowHours(runWindow);

  const assessment = useMemo(() => {
    if (!todayWorkout || !weather.data) return null;
    return assessWorkoutWeather({
      type: todayWorkout.type as WorkoutType,
      hours: weather.data.hours,
      pm25: weather.data.air,
      windowStartHour: window.startHour,
      windowEndHour: window.endHour,
      date: today,
    });
  }, [todayWorkout, weather.data, window.startHour, window.endHour, today]);

  const candidate = useMemo(() => {
    if (!todayWorkout || !assessment || (assessment.severity !== 'swap' && assessment.severity !== 'warn')) return null;
    const picked = pickSwapCandidate(
      {
        id: todayWorkout.id,
        date: today,
        type: todayWorkout.type as WorkoutType,
        status: todayWorkout.status as WorkoutStatus,
      },
      weekWorkouts.map((workout) => ({
        id: workout.id,
        date: workout.workout_date,
        type: workout.type as WorkoutType,
        status: workout.status as WorkoutStatus,
      })),
    );
    return picked ? (weekWorkouts.find((workout) => workout.id === picked.id) ?? null) : null;
  }, [todayWorkout, assessment, weekWorkouts, today]);

  const week = useMemo(() => weekProgress(weekWorkouts), [weekWorkouts]);
  const streak = useMemo(() => runStreak(planWorkouts, today), [planWorkouts, today]);
  const upcoming = useMemo(() => nextWorkout(planWorkouts, today), [planWorkouts, today]);

  if (planLoading || workoutsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (planError) return <QueryError onRetry={() => void refetchPlan()} />;

  if (!plan) {
    return (
      <EmptyState
        title="Još nemamo plan"
        description="Hajde da napravimo tvoj plan — trka, tempo i dani koje imaš."
        action={
          <Link to="/settings">
            <AppButton size="sm">Otvori podešavanja</AppButton>
          </Link>
        }
      />
    );
  }

  const raceInfo = plan.races;
  const daysToRace = raceInfo ? dayDiff(today, plan.race_date) : null;
  const planWeek = Math.min(Math.floor(dayDiff(plan.start_date, today) / 7) + 1, plan.weeks);
  const verdict = assessment ? assessmentText(assessment) : null;
  const isStrength = todayWorkout?.type === 'STRENGTH';
  const showVerdict = Boolean(
    verdict && !bannerDismissed && !isStrength && todayWorkout?.status === 'PLANNED' && todayWorkout.type !== 'REST',
  );
  const isTrainingDay = Boolean(todayWorkout && todayWorkout.type !== 'REST' && todayWorkout.status === 'PLANNED');
  const weatherDate = isTrainingDay ? today : addDaysIso(today, 1);
  const showNextWorkout = Boolean(
    upcoming && (!todayWorkout || todayWorkout.type === 'REST' || todayWorkout.status !== 'PLANNED'),
  );
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? null;
  const stats = todayWorkout ? heroStats(todayWorkout, (plan.paces ?? null) as unknown as PlanPaces | null) : [];

  const raceChipClickable = Boolean(raceInfo && daysToRace !== null && daysToRace >= 0);
  const raceChipContent = raceInfo ? (
    <>
      <p className="section-label">Ciljna trka</p>
      <p className="text-sm font-medium">{raceInfo.name ?? 'Trka bez naziva'}</p>
      {daysToRace !== null && daysToRace >= 0 ? (
        <p className="flex items-baseline gap-2">
          <span className="num value-swap text-hero font-bold text-primary-ink">{daysToRace}</span>
          <span className="text-sm text-text-secondary">dana do trke</span>
        </p>
      ) : (
        <Link to="/settings" className="block text-sm font-medium text-primary-ink hover:text-primary-ink-hover">
          Trka je prošla — napravi novi plan
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
        <p className="num text-caption text-text-muted">
          Nedelja {planWeek} / {plan.weeks}
        </p>
      </div>
    </>
  ) : (
    <>
      <p className="section-label">Plan</p>
      <p className="num text-stat font-semibold">
        Nedelja {planWeek} / {plan.weeks}
      </p>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-lg font-semibold">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </p>
        <span
          className={clsx(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-caption font-medium',
            streakClasses(streak),
          )}
        >
          <Flame className="h-4 w-4" aria-hidden />
          <span className="num font-semibold">{streak}</span>
          <span className="whitespace-nowrap">dana u nizu</span>
        </span>
      </div>

      {todayWorkout ? (
        <AppCard data-testid="today-hero" className="space-y-4 overflow-hidden">
          <div className={clsx('-mx-4 -mt-4 h-1', phaseBarClass(todayWorkout.phase))} aria-hidden />
          <div className="flex items-center justify-between gap-3">
            <p className="section-label flex min-w-0 items-center gap-1.5">
              <WorkoutTypeIcon
                type={todayWorkout.type}
                className={clsx('h-4 w-4 shrink-0', TONE_TEXT_CLASSES[typeTone(todayWorkout.type)])}
              />
              <span className="truncate">Danas · {formatDateLong(today)}</span>
            </p>
            {todayWorkout.status !== 'PLANNED' ? (
              <AppBadge tone={statusTone(todayWorkout.status)}>
                {todayWorkout.status === 'DONE' ? 'Urađeno' : 'Preskočeno'}
              </AppBadge>
            ) : null}
          </div>

          <div className="flex items-start justify-between gap-3">
            <p data-testid="today-workout-title" className="text-2xl font-semibold tracking-display">
              {todayWorkout.title}
            </p>
            <PaceZoneBadge zone={todayWorkout.pace_zone} />
          </div>

          <p className="num text-sm text-text-secondary">
            {typeLabel(todayWorkout.type)}
            {todayWorkout.distance_km > 0 ? ` · ${todayWorkout.distance_km} km` : ''}
            {todayWorkout.duration_sec ? ` · ${formatDuration(todayWorkout.duration_sec)}` : ''}
          </p>

          {showVerdict && verdict ? (
            <div
              data-testid="rain-banner"
              className={clsx('rounded-xl border-l-2 p-3', verdictToneClasses[verdict.tone])}
            >
              <p className="text-sm font-semibold">{verdict.title}</p>
              <p className="mt-0.5 text-caption text-text-secondary">
                {verdict.description}
                {candidate ? ` Najbliži slobodan termin: ${formatDateShort(candidate.workout_date)}.` : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {candidate ? (
                  <AppButton
                    type="button"
                    size="sm"
                    loading={swapWorkouts.isPending}
                    data-testid="swap-button"
                    onClick={() => {
                      if (todayWorkout && candidate)
                        void swapWorkouts.mutateAsync({ first: todayWorkout, second: candidate });
                    }}
                  >
                    Prebaci na {formatDateShort(candidate.workout_date)}
                  </AppButton>
                ) : null}
                <AppButton type="button" size="sm" variant="ghost" onClick={() => setBannerDismissed(true)}>
                  Ostajem po planu
                </AppButton>
              </div>
            </div>
          ) : null}

          {stats.length >= 2 ? <StatRow items={stats} className="rounded-xl bg-surface-elevated py-1" /> : null}

          <div className="space-y-2">
            <div className="flex gap-2">
              {todayWorkout.status === 'PLANNED' && todayWorkout.type !== 'REST' ? (
                isStrength ? (
                  <AppButton
                    size="lg"
                    className="flex-1"
                    loading={completeWorkout.isPending}
                    data-testid="complete-strength"
                    onClick={() => void completeWorkout.mutateAsync(todayWorkout.id)}
                  >
                    <CheckCircle2 className="h-5 w-5" aria-hidden /> Završi trening
                  </AppButton>
                ) : (
                  <AppButton size="lg" className="flex-1" data-testid="log-done" onClick={() => setLogOpen(true)}>
                    <CheckCircle2 className="h-5 w-5" aria-hidden /> Urađeno
                  </AppButton>
                )
              ) : null}
              {isGuidedRunType(todayWorkout.type) &&
              todayWorkout.status === 'PLANNED' &&
              workoutSteps(todayWorkout).length > 0 ? (
                <Link to={`/run/${todayWorkout.id}`} className="flex-1" data-testid="start-guided">
                  <AppButton variant="secondary" size="lg" className="w-full">
                    Vođeno
                  </AppButton>
                </Link>
              ) : null}
            </div>
            <Link
              to={`/workout/${todayWorkout.id}`}
              className="block text-center text-sm font-medium text-primary-ink hover:text-primary-ink-hover"
            >
              Pogledaj trening
            </Link>
          </div>
        </AppCard>
      ) : (
        <EmptyState
          title="Danas je slobodan dan"
          description="Baci pogled na kalendar — sledeći trening te čeka."
          icon={<CalendarDays className="h-6 w-6" />}
        />
      )}

      {raceChipClickable ? (
        <Link to="/race-day" data-testid="race-chip" className="block">
          <AppCard className="space-y-2 border-primary/40 bg-gradient-to-b from-primary-soft to-transparent">
            {raceChipContent}
            <p className="flex items-center gap-1 pt-1 text-sm font-medium text-primary-ink">
              Dan trke <ArrowRight className="h-4 w-4" aria-hidden />
            </p>
          </AppCard>
        </Link>
      ) : (
        <AppCard
          data-testid="race-chip"
          className="space-y-2 border-primary/40 bg-gradient-to-b from-primary-soft to-transparent"
        >
          {raceChipContent}
        </AppCard>
      )}

      <AppCard data-testid="week-board" className="space-y-3">
        <SectionHeader
          label="Tvoja nedelja"
          action={
            <Link to="/plan" className="text-sm font-medium text-primary-ink hover:text-primary-ink-hover">
              Ceo plan
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
              {week.doneKm} <span className="text-base font-medium text-text-secondary">/ {week.plannedKm} km</span>
            </p>
            <p className="text-caption text-text-muted">
              {week.doneSessions} od {week.plannedSessions} treninga ove nedelje
            </p>
          </div>
        </div>
        <WeekStrip workouts={weekWorkouts} today={today} />
      </AppCard>

      {showNextWorkout && upcoming ? <NextWorkoutCard workout={upcoming} today={today} /> : null}

      <WeatherSummaryCard
        variant="row"
        data={weather.data}
        isError={weather.isError}
        date={weatherDate}
        dayLabel={weatherDate === today ? undefined : 'sutra'}
        windowStartHour={window.startHour}
        windowEndHour={window.endHour}
        updatedAt={weather.dataUpdatedAt || null}
        loading={weather.isLoading}
        onRefresh={() => void weather.refetch()}
      />

      <RecentActivityCard logs={logs} />

      <LogWorkoutModal workout={todayWorkout} open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}
