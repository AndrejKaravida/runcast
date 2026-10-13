import { useMutation } from '@tanstack/react-query';
import { buildWorkoutTcx } from '@runcast/shared';
import { planPaces } from '@/features/plans/plan-data';
import { workoutSteps } from '@/features/workouts/utils';
import { downloadBlob } from '@/lib/download';
import type { PlansRow, WorkoutsRow } from '@/types';

export interface ExportWorkoutTcxInput {
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

export function useExportWorkoutTcx() {
  return useMutation({
    mutationFn: async ({ workout, plan }: ExportWorkoutTcxInput): Promise<void> => {
      const tcx = buildWorkoutTcx({
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
        `${workout.workout_date}-${slugify(workout.title)}.tcx`,
        new Blob([tcx], { type: 'application/vnd.garmin.tcx+xml;charset=utf-8' }),
      );
    },
  });
}
