import { useTranslation } from 'react-i18next';
import { ListRow } from '@/components/ui/ListRow';
import { WorkoutTypeIcon } from '@/components/workouts/WorkoutTypeIcon';
import { typeLabel } from '@/features/workouts/utils';
import { addDaysIso, formatDateShort } from '@/lib/dates';
import type { WorkoutsRow } from '@/types';

export function NextWorkoutCard({ workout, today }: { workout: WorkoutsRow; today: string }) {
  const { t } = useTranslation('workout');
  const isTomorrow = workout.workout_date === addDaysIso(today, 1);
  return (
    <ListRow
      to={`/workout/${workout.id}`}
      testId="next-workout"
      eyebrow={t('next.eyebrow')}
      icon={<WorkoutTypeIcon type={workout.type} className="h-5 w-5" strokeWidth={1.75} />}
      title={`${isTomorrow ? t('next.tomorrow') : formatDateShort(workout.workout_date)} · ${typeLabel(t, workout.type)}`}
      value={workout.distance_km > 0 ? `${workout.distance_km} km` : undefined}
    />
  );
}
