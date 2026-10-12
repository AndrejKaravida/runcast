import { clsx } from 'clsx';
import { Check, X } from 'lucide-react';
import { Link } from 'react-router';
import { TONE_DOT_CLASSES, typeTone } from '@/features/workouts/utils';
import { addDaysIso, startOfWeekIso, todayIso } from '@/lib/dates';
import type { WorkoutsRow } from '@/types';

const DAY_LABELS = ['pon', 'uto', 'sre', 'čet', 'pet', 'sub', 'ned'];

export function WeekStrip({ workouts, today = todayIso() }: { workouts: WorkoutsRow[]; today?: string }) {
  const weekStart = startOfWeekIso(today);
  return (
    <div className="grid grid-cols-7 gap-1">
      {DAY_LABELS.map((label, index) => {
        const date = addDaysIso(weekStart, index);
        const workout = workouts.find((item) => item.workout_date === date);
        const isToday = date === today;
        return (
          <Link
            key={date}
            to={workout ? `/workout/${workout.id}` : '/plan'}
            className={clsx(
              'flex select-none flex-col items-center gap-1.5 rounded-lg px-1 py-2 transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.96]',
              isToday ? 'bg-primary-soft' : 'hover:bg-surface-elevated',
            )}
          >
            <span className={clsx('text-caption font-medium', isToday ? 'text-primary-ink' : 'text-text-muted')}>
              {label}
            </span>
            <span className="num text-sm font-semibold">{Number(date.slice(8, 10))}</span>
            {workout ? (
              workout.status === 'DONE' ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-on-accent">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              ) : workout.status === 'SKIPPED' ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-danger text-on-accent">
                  <X className="h-3 w-3" aria-hidden />
                </span>
              ) : (
                <span className={clsx('h-2.5 w-2.5 rounded-full', TONE_DOT_CLASSES[typeTone(workout.type)])} />
              )
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-surface-elevated" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
