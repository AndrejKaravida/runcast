import { useMemo, useState } from 'react';
import {
  assessWorkoutWeather,
  formatDuration,
  isGuidedRunType,
  pickSwapCandidate,
  runWindowHours,
  type RunWindow,
  type WorkoutStatus,
  type WorkoutType,
} from '@runcast/shared';
import { CalendarDays, CheckCircle2, Flame } from 'lucide-react';
import { Link } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { QueryError } from '@/components/ui/QueryError';
import { Skeleton } from '@/components/ui/Skeleton';
import { WeatherSummaryCard } from '@/components/weather/WeatherSummaryCard';
import { assessmentText } from '@/components/weather/weather-utils';
import { LogWorkoutModal } from '@/components/workouts/LogWorkoutModal';
import { NextWorkoutCard } from '@/components/workouts/NextWorkoutCard';
import { PaceZoneBadge } from '@/components/workouts/PaceZoneBadge';
import { RecentActivityCard } from '@/components/workouts/RecentActivityCard';
import { WeekStrip } from '@/components/workouts/WeekStrip';
import { useCompleteWorkout, useRunLogs } from '@/features/logs/queries';
import { nextWorkout, runStreak, weekProgress } from '@/features/plans/progress';
import { useActivePlan, useSwapWorkouts, useWorkoutsRange } from '@/features/plans/queries';
import { useProfile } from '@/features/profile/queries';
import { useWeather } from '@/features/weather/queries';
import { statusTone, typeLabel, workoutSteps } from '@/features/workouts/utils';
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
  rain: 'border-rain/40 bg-rain-soft',
  warning: 'border-warning/40 bg-warning-soft',
  danger: 'border-danger/40 bg-danger-soft',
} as const;

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
        title="Nema aktivnog plana"
        description="Napravi plan u podešavanjima — izaberi trku, tempo i raspored."
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

  return (
    <div className="space-y-4">
      {todayWorkout ? (
        <AppCard
          data-testid="today-hero"
          className={todayWorkout.type === 'REST' ? 'space-y-3' : 'space-y-3 border-primary/30'}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Danas · {formatDateLong(today)}
            </p>
            <AppBadge tone={statusTone(todayWorkout.status)}>
              {todayWorkout.status === 'DONE'
                ? 'Urađeno'
                : todayWorkout.status === 'SKIPPED'
                  ? 'Preskočeno'
                  : 'Planirano'}
            </AppBadge>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p data-testid="today-workout-title" className="text-lg font-semibold">
                {todayWorkout.title}
              </p>
              <p className="mt-0.5 text-sm text-text-secondary">
                {todayWorkout.type === 'STRENGTH' ? 'Snaga' : typeLabel(todayWorkout.type)}
                {todayWorkout.distance_km > 0 ? ` · ${todayWorkout.distance_km} km` : ''}
                {todayWorkout.type === 'STRENGTH' && todayWorkout.duration_sec
                  ? ` · ${formatDuration(todayWorkout.duration_sec)}`
                  : ''}
              </p>
            </div>
            <PaceZoneBadge zone={todayWorkout.pace_zone} />
          </div>

          {showVerdict && verdict ? (
            <div data-testid="rain-banner" className={`rounded-xl border p-3 ${verdictToneClasses[verdict.tone]}`}>
              <p className="text-sm font-semibold">{verdict.title}</p>
              <p className="mt-0.5 text-xs text-text-secondary">
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
                  Ostavi kako je
                </AppButton>
              </div>
            </div>
          ) : null}

          {workoutSteps(todayWorkout).length > 0 && todayWorkout.type !== 'REST' ? (
            <ul className="space-y-1 rounded-xl bg-surface-elevated p-3 text-sm text-text-secondary">
              {workoutSteps(todayWorkout)
                .slice(0, 3)
                .map((step, index) => (
                  <li key={`${step.label}-${index}`} className="flex items-center justify-between gap-2">
                    <span>{step.label}</span>
                    {step.pace ? (
                      <span className="text-text-muted">{step.pace} /km</span>
                    ) : step.durationSec ? (
                      <span className="shrink-0 text-text-muted">{formatDuration(step.durationSec)}</span>
                    ) : null}
                  </li>
                ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Link to={`/workout/${todayWorkout.id}`} className="flex-1">
              <AppButton variant="secondary" className="w-full" size="sm">
                Detalj treninga
              </AppButton>
            </Link>
            {isGuidedRunType(todayWorkout.type) &&
            todayWorkout.status === 'PLANNED' &&
            workoutSteps(todayWorkout).length > 0 ? (
              <Link to={`/run/${todayWorkout.id}`} className="flex-1" data-testid="start-guided">
                <AppButton variant="secondary" className="w-full" size="sm">
                  Vođeno
                </AppButton>
              </Link>
            ) : null}
            {todayWorkout.status === 'PLANNED' && todayWorkout.type !== 'REST' ? (
              isStrength ? (
                <AppButton
                  size="sm"
                  className="flex-1"
                  loading={completeWorkout.isPending}
                  data-testid="complete-strength"
                  onClick={() => void completeWorkout.mutateAsync(todayWorkout.id)}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Završi trening
                </AppButton>
              ) : (
                <AppButton size="sm" className="flex-1" data-testid="log-done" onClick={() => setLogOpen(true)}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Urađeno
                </AppButton>
              )
            ) : null}
          </div>
        </AppCard>
      ) : (
        <EmptyState
          title="Za danas nema treninga u planu"
          description="Pogledaj kalendar za ostatak nedelje."
          icon={<CalendarDays className="h-6 w-6" />}
        />
      )}

      <div className="grid grid-cols-2 gap-3" data-testid="race-chip">
        <div className="rounded-2xl border border-border bg-surface p-3">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {raceInfo?.name ?? (raceInfo ? 'Ciljna trka' : 'Plan')}
          </p>
          {raceInfo ? (
            daysToRace !== null && daysToRace >= 0 ? (
              <p className="mt-0.5 text-sm font-medium">
                <span className="text-xl font-bold text-primary">{daysToRace}</span> dana do trke
              </p>
            ) : (
              <Link to="/settings" className="mt-0.5 block text-sm font-medium text-primary hover:text-primary-pressed">
                Trka je prošla — napravi novi plan
              </Link>
            )
          ) : (
            <p className="mt-0.5 text-sm font-medium">
              Nedelja {planWeek}/{plan.weeks}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Niz trčanja</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
            <Flame className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-xl font-bold text-success">{streak}</span> {streak === 1 ? 'dan' : 'dana'}
          </p>
        </div>
      </div>

      <AppCard data-testid="week-board" className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Ova nedelja</p>
          <Link to="/plan" className="text-sm font-medium text-primary hover:text-primary-pressed">
            Ceo plan
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <ProgressRing value={week.plannedSessions > 0 ? week.doneSessions / week.plannedSessions : 0}>
            <span className="text-xs font-semibold">
              {week.doneSessions}/{week.plannedSessions}
            </span>
          </ProgressRing>
          <div className="text-sm">
            <p data-testid="weekly-km">
              <span className="font-semibold">{week.doneKm}</span> / {week.plannedKm} km
            </p>
            <p className="mt-0.5 text-text-muted">treninga ove nedelje</p>
          </div>
        </div>
        <WeekStrip workouts={weekWorkouts} today={today} />
      </AppCard>

      {showNextWorkout && upcoming ? <NextWorkoutCard workout={upcoming} today={today} /> : null}

      <WeatherSummaryCard
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
