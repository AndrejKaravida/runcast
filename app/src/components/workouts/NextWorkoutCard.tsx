import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { typeLabel } from '@/features/workouts/utils';
import { addDaysIso, formatDateShort } from '@/lib/dates';
import type { WorkoutsRow } from '@/types';

export function NextWorkoutCard({ workout, today }: { workout: WorkoutsRow; today: string }) {
  const isTomorrow = workout.workout_date === addDaysIso(today, 1);
  return (
    <Link
      to={`/workout/${workout.id}`}
      data-testid="next-workout"
      className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3.5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99]"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Sledeće</p>
        <p className="mt-0.5 truncate text-sm font-medium">
          {isTomorrow ? 'Sutra' : formatDateShort(workout.workout_date)} · {typeLabel(workout.type)}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm text-text-secondary">
        {workout.distance_km} km
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
}
