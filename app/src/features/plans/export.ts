import { useMutation } from '@tanstack/react-query';
import {
  buildGoogleCalendarUrl,
  buildIcs,
  buildPlanEvents,
  type IcsWorkout,
  type PlanPaces,
  type RunWindow,
  type WorkoutType,
} from '@runcast/shared';
import { useAuth } from '@/auth/AuthProvider';
import { workoutSteps } from '@/features/workouts/utils';
import { supabase } from '@/lib/supabase';
import type { WorkoutsRow } from '@/types';

export interface ExportPlanInput {
  planId: string;
  runWindow: RunWindow;
  paces: PlanPaces | null;
}

export function toIcsWorkout(row: WorkoutsRow): IcsWorkout {
  return {
    id: row.id,
    date: row.workout_date,
    type: row.type as WorkoutType,
    title: row.title,
    distanceKm: row.distance_km,
    durationSec: row.duration_sec,
    steps: workoutSteps(row),
  };
}

function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function useExportPlanIcs() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async ({ planId, runWindow, paces }: ExportPlanInput): Promise<void> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId as string)
        .eq('plan_id', planId)
        .order('workout_date', { ascending: true });
      if (error) throw error;
      const events = buildPlanEvents((data ?? []).map(toIcsWorkout), { runWindow, paces });
      downloadTextFile('runcast-plan.ics', buildIcs(events));
    },
  });
}

export function buildGoogleCalendarUrlForWorkout(
  row: WorkoutsRow,
  options: { runWindow: RunWindow; paces: PlanPaces | null },
): string | null {
  if (row.type === 'REST') return null;
  const [event] = buildPlanEvents([toIcsWorkout(row)], options);
  return event ? buildGoogleCalendarUrl(event) : null;
}
