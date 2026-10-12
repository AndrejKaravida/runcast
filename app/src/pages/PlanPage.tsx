import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/QueryError';
import { Skeleton } from '@/components/ui/Skeleton';
import { PaceZoneBadge } from '@/components/workouts/PaceZoneBadge';
import { useActivePlan, useWorkoutsRange } from '@/features/plans/queries';
import { statusTone, TONE_DOT_CLASSES, typeLabel, typeTone } from '@/features/workouts/utils';
import {
  addDaysIso,
  addMonthsIso,
  endOfWeekIso,
  firstDayOfMonth,
  formatDateShort,
  formatMonth,
  lastDayOfMonth,
  startOfWeekIso,
  todayIso,
} from '@/lib/dates';
import type { WorkoutsRow } from '@/types';

const DAY_HEADERS = ['pon', 'uto', 'sre', 'čet', 'pet', 'sub', 'ned'];

const LEGEND = [
  { label: 'Kvalitet', dot: 'bg-primary' },
  { label: 'Dugi trk', dot: 'bg-rain' },
  { label: 'Lagano', dot: 'bg-text-muted' },
  { label: 'Snaga', dot: 'bg-warning' },
  { label: 'Urađeno', dot: 'bg-success' },
  { label: 'Preskočeno', dot: 'bg-danger' },
];

function dotClass(workout: WorkoutsRow): string {
  if (workout.status === 'DONE') return TONE_DOT_CLASSES.success;
  if (workout.status === 'SKIPPED') return TONE_DOT_CLASSES.danger;
  if (workout.type === 'STRENGTH') return TONE_DOT_CLASSES.warning;
  return TONE_DOT_CLASSES[typeTone(workout.type)];
}

function WeekRow({ workout }: { workout: WorkoutsRow }) {
  return (
    <Link
      to={`/workout/${workout.id}`}
      data-testid="week-row"
      data-date={workout.workout_date}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{workout.title}</p>
        <p className="text-xs text-text-muted">
          {formatDateShort(workout.workout_date)} · {workout.type === 'STRENGTH' ? 'Snaga' : typeLabel(workout.type)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <PaceZoneBadge zone={workout.pace_zone} />
        <AppBadge tone={statusTone(workout.status)}>
          {workout.status === 'DONE' ? 'Urađeno' : workout.status === 'SKIPPED' ? 'Preskočeno' : 'Planirano'}
        </AppBadge>
      </div>
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
  const listWorkouts = monthWorkouts.filter(
    (workout) => workout.workout_date >= listStart && workout.workout_date <= listEnd,
  );

  if (planLoading || monthLoading) return <Skeleton className="h-96" />;
  if (planError) return <QueryError onRetry={() => void refetch()} />;

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <AppButton
          size="sm"
          variant="ghost"
          aria-label="Prethodni mesec"
          onClick={() => setMonthAnchor((current) => addMonthsIso(current, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </AppButton>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold capitalize">{formatMonth(monthAnchor)}</p>
          {!isCurrentMonth ? (
            <button
              type="button"
              onClick={() => setMonthAnchor(firstDayOfMonth(today))}
              className="rounded-lg bg-surface-elevated px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              Vrati na danas
            </button>
          ) : null}
        </div>
        <AppButton
          size="sm"
          variant="ghost"
          aria-label="Sledeći mesec"
          onClick={() => setMonthAnchor((current) => addMonthsIso(current, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </AppButton>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-text-muted">
        {DAY_HEADERS.map((label) => (
          <span key={label}>{label}</span>
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
                  className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-xs ${
                    isToday ? 'border-primary/60 bg-primary-soft' : 'border-border bg-surface'
                  } ${inMonth ? '' : 'opacity-40'}`}
                >
                  <span className={isToday ? 'font-bold text-primary' : 'font-medium'}>
                    {Number(date.slice(8, 10))}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${workout ? dotClass(workout) : 'bg-surface-elevated'}`} />
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

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${item.dot}`} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">{isCurrentMonth ? 'Ova nedelja' : 'Prva nedelja meseca'}</p>
        {listWorkouts.length === 0 ? (
          <p className="text-sm text-text-muted">Nema treninga u ovom periodu.</p>
        ) : (
          listWorkouts.map((workout) => <WeekRow key={workout.id} workout={workout} />)
        )}
      </div>
    </div>
  );
}
