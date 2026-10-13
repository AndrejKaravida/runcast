import { useMutation } from '@tanstack/react-query';
import { buildWorkoutFit } from '@runcast/shared';
import { planPaces } from '@/features/plans/plan-data';
import { workoutSteps } from '@/features/workouts/utils';
import { downloadBlob } from '@/lib/download';
import type { PlansRow, WorkoutsRow } from '@/types';

export interface ExportWorkoutFitInput {
  workout: WorkoutsRow;
  plan: PlansRow | null | undefined;
}

function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'trening'
  );
}

export function useExportWorkoutFit() {
  return useMutation({
    mutationFn: async ({ workout, plan }: ExportWorkoutFitInput): Promise<void> => {
      const fit = buildWorkoutFit({
        workout: {
          date: workout.workout_date,
          title: workout.title,
          distanceKm: workout.distance_km,
          durationSec: workout.duration_sec,
          steps: workoutSteps(workout),
        },
        paces: planPaces(plan),
      });
      downloadBlob(
        `${workout.workout_date}-${slugify(workout.title)}.fit`,
        new Blob([fit], { type: 'application/vnd.ant.fit' }),
      );
    },
  });
}
