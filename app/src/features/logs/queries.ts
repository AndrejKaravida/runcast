import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { RunLogsRow, WorkoutsRow } from '@/types';

export interface LogWorkoutInput {
  workout: WorkoutsRow;
  distanceKm: number;
  durationSec: number;
  rpe: number;
  notes?: string;
}

function invalidateWorkoutData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['workouts'] });
  queryClient.invalidateQueries({ queryKey: ['workout'] });
  queryClient.invalidateQueries({ queryKey: ['run-logs'] });
}

export function useLogWorkout() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id as string;
  return useMutation({
    mutationFn: async (input: LogWorkoutInput) => {
      const { error: logError } = await supabase.from('run_logs').insert({
        user_id: userId,
        workout_id: input.workout.id,
        log_date: input.workout.workout_date,
        distance_km: input.distanceKm,
        duration_sec: input.durationSec,
        avg_pace_sec_per_km: Math.round(input.durationSec / input.distanceKm),
        rpe: input.rpe,
        notes: input.notes ?? null,
      });
      if (logError) throw logError;

      const { error: workoutError } = await supabase
        .from('workouts')
        .update({ status: 'DONE' })
        .eq('id', input.workout.id)
        .eq('user_id', userId);
      if (workoutError) throw workoutError;
    },
    onSuccess: () => invalidateWorkoutData(queryClient),
  });
}

export function useSkipWorkout() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id as string;
  return useMutation({
    mutationFn: async (workoutId: string) => {
      const { error } = await supabase
        .from('workouts')
        .update({ status: 'SKIPPED' })
        .eq('id', workoutId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => invalidateWorkoutData(queryClient),
  });
}

export function useCompleteWorkout() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id as string;
  return useMutation({
    mutationFn: async (workoutId: string) => {
      const { error } = await supabase
        .from('workouts')
        .update({ status: 'DONE' })
        .eq('id', workoutId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => invalidateWorkoutData(queryClient),
  });
}

export function useRunLogs() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['run-logs', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<RunLogsRow[]> => {
      const { data, error } = await supabase
        .from('run_logs')
        .select('*')
        .eq('user_id', userId as string)
        .order('log_date', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });
}
