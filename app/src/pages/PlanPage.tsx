import { useState } from 'react';
import { formatDuration } from '@runcast/shared';
import { clsx } from 'clsx';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { Link } from 'react-router';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/QueryError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useActivePlan, useWorkoutsRange } from '@/features/plans/queries';
import { phaseLabel, TONE_DOT_CLASSES, typeTone, workoutDurationSec } from '@/features/workouts/utils';
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
import type { WorkoutsRow } from '@/types';

const DAY_LABELS = ['pon', 'uto', 'sre', 'čet', 'pet', 'sub', 'ned'];
const PHASES = ['BASE', 'BUILD', 'PEAK', 'TAPER', 'RACE'];

function dotClass(workout: WorkoutsRow): string {
  if (workout.status === 'DONE') return TONE_DOT_CLASSES.success;
  if (workout.status === 'SKIPPED') return TONE_DOT_CLASSES.danger;
  return TONE_DOT_CLASSES[typeTone(workout.type)];
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
  const isDone = workout?.status === 'DONE';
  const isSkipped = workout?.status === 'SKIPPED';
  const isRest = !workout || workout.type === 'REST';
  const barClass = workout && !isRest ? TONE_DOT_CLASSES[typeTone(workout.type)] : 'bg-transparent';
  const duration = workout ? workoutDurationSec(workout) : null;
  const meta = !workout
    ? 'Slobodan dan'
    : workout.type === 'REST'
      ? 'Dan za oporavak'
      : [workout.distance_km > 0 ? `${workout.distance_km} km` : null, duration ? formatDuration(duration) : null]
          .filter(Boolean)
          .join(' · ');

  return (
    <Link
      to={workout ? `/workout/${workout.id}` : '/plan'}
      data-testid="week-row"
      data-date={date}
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
          {workout ? workout.title : 'Bez treninga'}
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
  const today = todayIso();
  const [monthAnchor, setMonthAnchor] = useState(() => firstDayOfMonth(today));
  const gridStart = startOfWeekIso(monthAnchor);
  const gridEnd = endOfWeekIso(lastDayOfMonth(monthAnchor));
  const { data: plan, isLoading: planLoading, isError: planError, refetch } = useActivePlan();
  const { data: monthWorkouts = [], isLoading: monthLoading } = useWorkoutsRange(gridStart, gridEnd);

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

  if (planLoading || monthLoading) return <Skeleton className="h-96" />;
  if (planError) return <QueryError onRetry={() => void refetch()} />;

  if (!plan) {
    return (
      <EmptyState
        title="Još nemamo plan"
        description="Hajde da napravimo tvoj plan — trka, tempo i dani koje imaš."
        icon={<CalendarDays className="h-6 w-6" />}
        action={
          <Link to="/settings">
            <AppButton size="sm">Otvori podešavanja</AppButton>
          </Link>
        }
      />
    );
  }

  const daysToRace = dayDiff(today, plan.race_date);
  const planWeek = Math.min(Math.max(Math.floor(dayDiff(plan.start_date, today) / 7) + 1, 1), plan.weeks);
  const progressPct = Math.min(100, (planWeek / plan.weeks) * 100);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="section-label">Tvoj plan</p>
            <p className="num text-xl font-semibold">
              Nedelja {planWeek} / {plan.weeks}
            </p>
          </div>
          <p className="num shrink-0 text-right text-caption text-text-muted">
            {daysToRace >= 0 ? `${daysToRace} dana do trke` : 'Trka je prošla'}
            <br />
            {plan.days_per_week} dana nedeljno
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
                {phaseLabel(phase)}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeader
          label="Mesec"
          action={
            <div className="flex items-center gap-1">
              <AppButton
                size="sm"
                variant="ghost"
                aria-label="Prethodni mesec"
                onClick={() => setMonthAnchor((current) => addMonthsIso(current, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </AppButton>
              <p className="num min-w-24 text-center text-sm font-semibold capitalize">{formatMonth(monthAnchor)}</p>
              <AppButton
                size="sm"
                variant="ghost"
                aria-label="Sledeći mesec"
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
            Vrati na danas
          </button>
        ) : null}
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAY_LABELS.map((label) => (
            <span key={label} className="section-label">
              {label}
            </span>
          ))}
        </div>
        <div className="space-y-1">
          {weeks.map((week) => (
            <div key={week[0]} className="grid grid-cols-7 gap-1">
              {week.map((date) => {
                const workout = monthWorkouts.find((item) => item.workout_date === date);
                const inMonth = date.slice(0, 7) === month;
                const isToday = date === today;
                const cell = (
                  <div
                    className={clsx(
                      'flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg',
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
                  </div>
                );
                return workout ? (
                  <Link key={date} to={`/workout/${workout.id}`} aria-label={`${date}: ${workout.title}`}>
                    {cell}
                  </Link>
                ) : (
                  <div key={date}>{cell}</div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <SectionHeader
          label={isCurrentMonth ? 'Ova nedelja' : 'Prva nedelja meseca'}
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
            <WeekRow
              key={date}
              workout={weekWorkouts.find((workout) => workout.workout_date === date) ?? null}
              date={date}
              dayLabel={DAY_LABELS[index]}
              isToday={date === today}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
