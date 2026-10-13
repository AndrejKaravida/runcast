import { useMemo, useState } from 'react';
import {
  assessWorkoutWeather,
  pickSwapCandidate,
  RESCHEDULE_GOOD_SCORE,
  runWindowHours,
  suggestReschedule,
  weeklyChallenge,
  type RescheduleSwapOption,
  type RunWindow,
  type WorkoutStatus,
  type WorkoutType,
} from '@runcast/shared';
import { clsx } from 'clsx';
import { CalendarDays, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AchievementToast } from '@/components/achievements/AchievementToast';
import { RaceChip } from '@/components/today/RaceChip';
import { ReadinessCard } from '@/components/today/ReadinessCard';
import { TodayHeroCard } from '@/components/today/TodayHeroCard';
import { WeekBoard } from '@/components/today/WeekBoard';
import { AppButton } from '@/components/ui/AppButton';
import { AppLinkButton } from '@/components/ui/AppLinkButton';
import { CountUp } from '@/components/ui/CountUp';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/QueryError';
import { Skeleton } from '@/components/ui/Skeleton';
import { WeatherHero } from '@/components/weather/WeatherHero';
import { WeatherSummaryCard } from '@/components/weather/WeatherSummaryCard';
import { assessmentText } from '@/components/weather/weather-utils';
import { LogWorkoutModal } from '@/components/workouts/LogWorkoutModal';
import { NextWorkoutCard } from '@/components/workouts/NextWorkoutCard';
import { RecentActivityCard } from '@/components/workouts/RecentActivityCard';
import { useAchievementCelebration } from '@/features/achievements/seen';
import { useReadiness } from '@/features/health/queries';
import { useCompleteWorkout, useRunLogs } from '@/features/logs/queries';
import { planPaces } from '@/features/plans/plan-data';
import { nextWorkout, runStreak, weekProgress } from '@/features/plans/progress';
import { useActivePlan, useSwapWorkouts, useWorkoutsRange } from '@/features/plans/queries';
import { useProfile } from '@/features/profile/queries';
import { useWeather } from '@/features/weather/queries';
import { heroStats } from '@/features/workouts/utils';
import { addDaysIso, dayDiff, endOfWeekIso, startOfWeekIso, todayIso } from '@/lib/dates';
import type { WorkoutsRow } from '@/types';

function greetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'greeting.morning';
  if (hour < 18) return 'greeting.afternoon';
  return 'greeting.evening';
}

function streakClasses(streak: number): string {
  if (streak >= 7) return 'bg-warning-soft text-warning-ink';
  if (streak >= 3) return 'bg-primary-soft text-primary-ink';
  return 'bg-surface-elevated text-text-muted';
}

const READINESS_QUALITY_TYPES: ReadonlySet<WorkoutType> = new Set(['TEMPO', 'INTERVALS', 'REPETITIONS']);

function pickWeekSwapCandidate(target: WorkoutsRow, weekWorkouts: WorkoutsRow[], today: string): WorkoutsRow | null {
  const picked = pickSwapCandidate(
    { id: target.id, date: today, type: target.type as WorkoutType, status: target.status as WorkoutStatus },
    weekWorkouts.map((workout) => ({
      id: workout.id,
      date: workout.workout_date,
      type: workout.type as WorkoutType,
      status: workout.status as WorkoutStatus,
    })),
  );
  return picked ? (weekWorkouts.find((workout) => workout.id === picked.id) ?? null) : null;
}

function TodaySkeleton() {
  return (
    <div data-testid="today-skeleton" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-80" />
      <Skeleton className="h-44" />
      <Skeleton className="h-52" />
    </div>
  );
}

export function TodayPage() {
  const { t } = useTranslation('today');
  const { data: profile } = useProfile();
  const { data: plan, isLoading: planLoading, isError: planError, refetch: refetchPlan } = useActivePlan();
  const today = todayIso();
  const {
    data: weekWorkouts = [],
    isLoading: workoutsLoading,
    isError: weekError,
    refetch: refetchWeek,
  } = useWorkoutsRange(startOfWeekIso(today), endOfWeekIso(today));
  const {
    data: planWorkouts = [],
    isError: planRangeError,
    refetch: refetchPlanRange,
  } = useWorkoutsRange(plan?.start_date ?? today, plan?.race_date ?? today);
  const { data: logs = [], isLoading: logsLoading } = useRunLogs();
  const weather = useWeather();
  const readiness = useReadiness();
  const swapWorkouts = useSwapWorkouts();
  const completeWorkout = useCompleteWorkout();
  const { achievement, dismiss } = useAchievementCelebration(planWorkouts, logs, profile);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const promptKey = `runcast.weather.prompt.${today}`;
  const [promptDismissed, setPromptDismissed] = useState(() => {
    try {
      return localStorage.getItem(promptKey) !== null;
    } catch {
      return false;
    }
  });
  const [rescheduleApplied, setRescheduleApplied] = useState(false);

  const todayWorkout = weekWorkouts.find((workout) => workout.workout_date === today) ?? null;
  const runWindow: RunWindow = (profile?.run_window as RunWindow | undefined) ?? 'morning';
  const window = runWindowHours(runWindow);
  const readinessTired = Boolean(
    readiness.data &&
    readiness.data.readiness.level === 'tired' &&
    todayWorkout?.status === 'PLANNED' &&
    READINESS_QUALITY_TYPES.has(todayWorkout.type as WorkoutType),
  );

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
    return pickWeekSwapCandidate(todayWorkout, weekWorkouts, today);
  }, [todayWorkout, assessment, weekWorkouts, today]);

  const readinessCandidate = useMemo(() => {
    if (!todayWorkout || !readinessTired) return null;
    return pickWeekSwapCandidate(todayWorkout, weekWorkouts, today);
  }, [todayWorkout, readinessTired, weekWorkouts, today]);

  const suggestion = useMemo(() => {
    if (!todayWorkout || !weather.data) return null;
    return suggestReschedule({
      workout: {
        id: todayWorkout.id,
        type: todayWorkout.type as WorkoutType,
        status: todayWorkout.status as WorkoutStatus,
      },
      weekWorkouts: weekWorkouts.map((workout) => ({
        id: workout.id,
        date: workout.workout_date,
        type: workout.type as WorkoutType,
        status: workout.status as WorkoutStatus,
      })),
      hours: weather.data.hours,
      pm25: weather.data.air,
      runWindow,
      today,
    });
  }, [todayWorkout, weekWorkouts, weather.data, runWindow, today]);

  const week = useMemo(() => weekProgress(weekWorkouts), [weekWorkouts]);
  const streak = useMemo(() => runStreak(planWorkouts, today), [planWorkouts, today]);
  const upcoming = useMemo(() => nextWorkout(planWorkouts, today), [planWorkouts, today]);
  const challenge = useMemo(
    () =>
      plan
        ? weeklyChallenge(
            { start_date: plan.start_date, race_date: plan.race_date },
            weekWorkouts.map((workout) => ({
              id: workout.id,
              workout_date: workout.workout_date,
              type: workout.type as WorkoutType,
              status: workout.status as WorkoutStatus,
              distance_km: workout.distance_km,
            })),
            today,
          )
        : null,
    [plan, weekWorkouts, today],
  );

  if (planLoading || workoutsLoading) {
    return <TodaySkeleton />;
  }

  if (planError) return <QueryError onRetry={() => void refetchPlan()} />;

  if (weekError) return <QueryError onRetry={() => void refetchWeek()} />;

  if (!plan) {
    return (
      <EmptyState
        title={t('empty.title')}
        description={t('empty.description')}
        action={
          <AppLinkButton to="/settings" size="sm">
            {t('empty.action')}
          </AppLinkButton>
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
  const reschedule =
    suggestion && suggestion.todayScore < RESCHEDULE_GOOD_SCORE && suggestion.options.length > 0 ? suggestion : null;
  const showReschedule = Boolean(reschedule && !bannerDismissed && !isStrength);
  const readinessVerdict =
    readinessTired && !verdict && !reschedule
      ? { title: t('readinessAssessment.title'), description: t('readinessAssessment.description') }
      : null;
  const isTrainingDay = Boolean(todayWorkout && todayWorkout.type !== 'REST' && todayWorkout.status === 'PLANNED');
  const weatherDate = isTrainingDay ? today : addDaysIso(today, 1);
  const showNextWorkout = Boolean(
    upcoming && (!todayWorkout || todayWorkout.type === 'REST' || todayWorkout.status !== 'PLANNED'),
  );
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? null;
  const stats = todayWorkout ? heroStats(t, todayWorkout, planPaces(plan)) : [];

  async function handleSwapWith(second: WorkoutsRow | null) {
    if (!todayWorkout || !second) return;
    try {
      setSwapError(null);
      await swapWorkouts.mutateAsync({ first: todayWorkout, second });
    } catch {
      setSwapError(t('verdict.swapError'));
    }
  }

  function rememberPrompt() {
    try {
      localStorage.setItem(promptKey, '1');
    } catch {
      return;
    }
  }

  function dismissPrompt() {
    rememberPrompt();
    setPromptDismissed(true);
  }

  async function handleApplyOption(option: RescheduleSwapOption) {
    if (!todayWorkout) return;
    const target = weekWorkouts.find((workout) => workout.id === option.workoutId);
    if (!target) return;
    try {
      setSwapError(null);
      await swapWorkouts.mutateAsync({ first: todayWorkout, second: target });
      rememberPrompt();
      setRescheduleApplied(true);
    } catch {
      setSwapError(t('verdict.swapError'));
    }
  }

  async function handleComplete() {
    if (!todayWorkout) return;
    try {
      setCompleteError(null);
      await completeWorkout.mutateAsync(todayWorkout.id);
    } catch {
      setCompleteError(t('actions.completeError'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-lg font-semibold">
          {t(greetingKey())}
          {firstName ? `, ${firstName}` : ''}
        </p>
        <span
          className={clsx(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-caption font-medium',
            streakClasses(streak),
          )}
        >
          <Flame className="h-4 w-4" aria-hidden />
          <CountUp value={streak} duration={0.35} className="num font-semibold" />
          <span className="whitespace-nowrap">{t('streak')}</span>
        </span>
      </div>

      {todayWorkout ? (
        <TodayHeroCard
          workout={todayWorkout}
          today={today}
          stats={stats}
          isStrength={isStrength}
          weatherLoading={weather.isLoading}
          verdict={showVerdict ? verdict : null}
          reschedule={showReschedule ? reschedule : null}
          readinessVerdict={readinessVerdict}
          candidate={candidate}
          readinessCandidate={readinessCandidate}
          promptDismissed={promptDismissed}
          rescheduleApplied={rescheduleApplied}
          swapPending={swapWorkouts.isPending}
          swapError={swapError}
          completePending={completeWorkout.isPending}
          completeError={completeError}
          onApplyOption={(option) => void handleApplyOption(option)}
          onLegacySwap={() => void handleSwapWith(candidate)}
          onReadinessSwap={() => void handleSwapWith(readinessCandidate)}
          onLegacyStay={() => setBannerDismissed(true)}
          onDismissPrompt={dismissPrompt}
          onComplete={() => void handleComplete()}
          onOpenLog={() => setLogOpen(true)}
        />
      ) : (
        <EmptyState
          title={t('rest.title')}
          description={t('rest.description')}
          icon={<CalendarDays className="h-6 w-6" />}
        />
      )}

      <WeatherHero
        data={weather.data}
        isError={weather.isError}
        isLoading={weather.isLoading}
        date={today}
        runWindow={runWindow}
      />

      <ReadinessCard hideHints={readinessVerdict !== null} />

      <RaceChip plan={plan} daysToRace={daysToRace} planWeek={planWeek} />

      {planRangeError ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-caption text-danger-ink">
          <span>{t('rangeError')}</span>
          <AppButton size="sm" variant="ghost" onClick={() => void refetchPlanRange()}>
            {t('common:actions.retry')}
          </AppButton>
        </div>
      ) : null}

      <WeekBoard week={week} challenge={challenge} workouts={weekWorkouts} today={today} />

      {showNextWorkout && upcoming ? <NextWorkoutCard workout={upcoming} today={today} /> : null}

      <WeatherSummaryCard
        variant="row"
        data={weather.data}
        isError={weather.isError}
        date={weatherDate}
        dayLabel={weatherDate === today ? undefined : t('tomorrow')}
        windowStartHour={window.startHour}
        windowEndHour={window.endHour}
        updatedAt={weather.dataUpdatedAt || null}
        loading={weather.isLoading}
        onRefresh={() => void weather.refetch()}
      />

      <RecentActivityCard logs={logs} isLoading={logsLoading} />

      <LogWorkoutModal workout={todayWorkout} open={logOpen} onClose={() => setLogOpen(false)} />
      <AchievementToast achievement={achievement} onDismiss={dismiss} />
    </div>
  );
}
