import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generatePlan, type PlanAnchor, type PlanConfig, type PlanPaces, type VolumeBand } from '@runcast/shared';
import { useAuth } from '@/auth/AuthProvider';
import { addDaysIso, todayIso } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { Json, PlansRow, WorkoutsRow } from '@/types';

export interface GeneratePlanInput {
  race: { name: string | null; raceDate: string; distanceKm: number; goalTimeSec: number | null } | null;
  recentRace: { distanceKm: number; timeSec: number } | null;
  daysPerWeek: 3 | 4 | 5 | 6;
  longRunDay: number;
  experience: 'first' | 'experienced';
  volumeBand: VolumeBand;
}

export type ActivePlan = PlansRow & {
  races: { name: string | null; race_date: string; distance_km: number; goal_time_sec: number | null } | null;
};

export function useActivePlan() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['plan', 'active', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ActivePlan | null> => {
      const { data, error } = await supabase
        .from('plans')
        .select('*, races(name, race_date, distance_km, goal_time_sec)')
        .eq('user_id', userId as string)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useWorkoutsRange(from: string, to: string) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['workouts', userId, from, to],
    enabled: Boolean(userId),
    queryFn: async (): Promise<WorkoutsRow[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId as string)
        .gte('workout_date', from)
        .lte('workout_date', to)
        .order('workout_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useWorkout(id: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['workout', userId, id],
    enabled: Boolean(userId && id),
    queryFn: async (): Promise<WorkoutsRow | null> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id as string)
        .eq('user_id', userId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useGeneratePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GeneratePlanInput): Promise<string> => {
      const anchor: PlanAnchor | null = input.recentRace
        ? { kind: 'race', distanceKm: input.recentRace.distanceKm, timeSec: input.recentRace.timeSec }
        : input.race?.goalTimeSec
          ? { kind: 'goal', distanceKm: input.race.distanceKm, timeSec: input.race.goalTimeSec }
          : null;

      const startDate = todayIso();
      const raceDate = input.race?.raceDate ?? addDaysIso(startDate, 8 * 7);
      const config: PlanConfig = {
        raceDate,
        startDate,
        distanceKm: input.race?.distanceKm ?? 42.195,
        daysPerWeek: input.daysPerWeek,
        longRunDay: input.longRunDay,
        experience: input.experience,
        volumeBand: input.volumeBand,
        anchor,
      };
      const draft = generatePlan(config);

      const { data, error } = await supabase.rpc('create_plan_with_workouts', {
        p_race: (input.race
          ? {
              name: input.race.name,
              raceDate: input.race.raceDate,
              distanceKm: input.race.distanceKm,
              goalTimeSec: input.race.goalTimeSec,
            }
          : null) as Json,
        p_start_date: startDate,
        p_race_date: raceDate,
        p_weeks: draft.weeks,
        p_days_per_week: input.daysPerWeek,
        p_long_run_day: input.longRunDay,
        p_experience: input.experience,
        p_volume_band: input.volumeBand,
        p_anchor: draft.anchor as unknown as Json,
        p_paces: draft.paces as unknown as Json,
        p_workouts: draft.workouts as unknown as Json,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['races'] });
    },
  });
}

export function useSwapWorkouts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ first, second }: { first: WorkoutsRow; second: WorkoutsRow }) => {
      const { error } = await supabase.rpc('swap_workouts', { p_first: first.id, p_second: second.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export interface RecalibratePlanInput {
  anchor: PlanAnchor;
  paces: PlanPaces;
  paceMap: Record<string, string>;
}

export function useRecalibratePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecalibratePlanInput) => {
      const { error } = await supabase.rpc('recalibrate_plan', {
        p_anchor: input.anchor as unknown as Json,
        p_paces: input.paces as unknown as Json,
        p_pace_map: input.paceMap as unknown as Json,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout'] });
    },
  });
}

export function useScaleWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ weekStart, factor }: { weekStart: string; factor: number }) => {
      const { error } = await supabase.rpc('scale_week_volume', { p_week_start: weekStart, p_factor: factor });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout'] });
    },
  });
}
