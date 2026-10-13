import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { todayIso } from '@/lib/dates';
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LogWorkoutInput) => {
      const { error } = await supabase.rpc('log_workout', {
        p_workout_id: input.workout.id,
        p_distance_km: input.distanceKm,
        p_duration_sec: input.durationSec,
        p_rpe: input.rpe,
        p_notes: input.notes ?? '',
      });
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('workouts')
        .update({ status: 'SKIPPED' })
        .eq('id', workoutId)
        .eq('user_id', userId)
        .select('id')
        .single();
      if (error) throw error;
      if (!data) throw new Error('Workout not updated');
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
      const { data, error } = await supabase
        .from('workouts')
        .update({ status: 'DONE' })
        .eq('id', workoutId)
        .eq('user_id', userId)
        .select('id')
        .single();
      if (error) throw error;
      if (!data) throw new Error('Workout not updated');
    },
    onSuccess: () => invalidateWorkoutData(queryClient),
  });
}

export interface BenchmarkLogInput {
  distanceKm: number;
  durationSec: number;
}

export function useSaveBenchmarkLog() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id as string;
  return useMutation({
    mutationFn: async (input: BenchmarkLogInput) => {
      const { error } = await supabase.from('run_logs').insert({
        user_id: userId,
        workout_id: null,
        log_date: todayIso(),
        distance_km: input.distanceKm,
        duration_sec: input.durationSec,
        avg_pace_sec_per_km: Math.round(input.durationSec / input.distanceKm),
        notes: 'Benchmark',
      });
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
