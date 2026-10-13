import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buildRecoveryPlan,
  generatePlan,
  type PlanAnchor,
  type PlanConfig,
  type PlanPaces,
  type VolumeBand,
} from '@runcast/shared';
import { useAuth } from '@/auth/AuthProvider';
import { addDaysIso, todayIso } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { Json, PlansRow, RacesRow, WorkoutsRow } from '@/types';

export interface GeneratePlanInput {
  race: { name: string | null; raceDate: string; distanceKm: number; goalTimeSec: number | null } | null;
  raceId?: string;
  recentRace: { distanceKm: number; timeSec: number } | null;
  daysPerWeek: 3 | 4 | 5 | 6;
  longRunDay: number;
  runDays?: number[];
  experience: 'first' | 'experienced';
  volumeBand: VolumeBand;
}

export type ActivePlan = PlansRow & {
  races: {
    id: string;
    name: string | null;
    race_date: string;
    distance_km: number;
    goal_time_sec: number | null;
  } | null;
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
        .select('*, races(id, name, race_date, distance_km, goal_time_sec)')
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
        runDays: input.runDays,
        experience: input.experience,
        volumeBand: input.volumeBand,
        anchor,
      };
      const draft = generatePlan(config);

      const racePayload =
        input.race && !input.raceId
          ? {
              name: input.race.name,
              raceDate: input.race.raceDate,
              distanceKm: input.race.distanceKm,
              goalTimeSec: input.race.goalTimeSec,
            }
          : null;

      const { data, error } = await supabase.rpc('create_plan_with_workouts', {
        p_race: racePayload as Json,
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

      if (input.raceId && input.race) {
        const { error: raceError } = await supabase
          .from('races')
          .update({
            name: input.race.name,
            race_date: input.race.raceDate,
            distance_km: input.race.distanceKm,
            goal_time_sec: input.race.goalTimeSec,
          })
          .eq('id', input.raceId);
        if (raceError) throw raceError;
        const { error: linkError } = await supabase.from('plans').update({ race_id: input.raceId }).eq('id', data);
        if (linkError) throw linkError;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['races'] });
    },
  });
}

export interface RecoveryPlanInput {
  startDate: string;
  runDays: number[];
}

export function useGenerateRecoveryPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ startDate, runDays }: RecoveryPlanInput): Promise<string> => {
      const raceDate = addDaysIso(startDate, 13);
      const workouts = buildRecoveryPlan({ startDate, runDays });

      const { data, error } = await supabase.rpc('create_plan_with_workouts', {
        p_race: null as unknown as Json,
        p_start_date: startDate,
        p_race_date: raceDate,
        p_weeks: 2,
        p_days_per_week: Math.max(3, runDays.length),
        p_long_run_day: 0,
        p_experience: null as unknown as string,
        p_volume_band: null as unknown as string,
        p_anchor: null as unknown as Json,
        p_paces: null as unknown as Json,
        p_workouts: workouts as unknown as Json,
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

export interface UpdateRaceInput {
  id: string;
  name: string | null;
  raceDate: string;
  distanceKm: number;
  goalTimeSec: number | null;
}

export function useUpdateRace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateRaceInput) => {
      const { error } = await supabase
        .from('races')
        .update({
          name: input.name,
          race_date: input.raceDate,
          distance_km: input.distanceKm,
          goal_time_sec: input.goalTimeSec,
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['races'] });
    },
  });
}

export function useRaces() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['races', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<RacesRow[]> => {
      const { data, error } = await supabase
        .from('races')
        .select('*')
        .eq('user_id', userId as string)
        .order('race_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export interface AddRaceInput {
  name: string | null;
  raceDate: string;
  distanceKm: number;
  goalTimeSec: number | null;
}

export function useAddRace() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddRaceInput) => {
      if (!userId) throw new Error('not authenticated');
      const { error } = await supabase.from('races').insert({
        user_id: userId,
        name: input.name,
        race_date: input.raceDate,
        distance_km: input.distanceKm,
        goal_time_sec: input.goalTimeSec,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });
}

export class RaceDeleteBlockedError extends Error {
  constructor() {
    super('race is the target of the active plan');
    this.name = 'RaceDeleteBlockedError';
  }
}

export function useSetPlanRace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (raceId: string) => {
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('id')
        .eq('status', 'ACTIVE')
        .maybeSingle();
      if (planError) throw planError;
      if (!plan) throw new Error('no active plan');
      const { error } = await supabase.from('plans').update({ race_id: raceId }).eq('id', plan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });
}

export function useDeleteRace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('race_id')
        .eq('status', 'ACTIVE')
        .maybeSingle();
      if (planError) throw planError;
      if (plan?.race_id === id) throw new RaceDeleteBlockedError();
      const { error } = await supabase.from('races').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
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

export function useMoveWorkout() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workout, date }: { workout: WorkoutsRow; date: string }): Promise<boolean> => {
      if (!userId) return false;
      const { data: target, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_id', workout.plan_id)
        .eq('workout_date', date)
        .maybeSingle();
      if (error) throw error;
      if (!target) return false;
      const { error: swapError } = await supabase.rpc('swap_workouts', {
        p_first: workout.id,
        p_second: target.id,
      });
      if (swapError) throw swapError;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout'] });
    },
  });
}

export interface WeekPlanAssignment {
  id: string;
  date?: string;
  status?: 'SKIPPED';
}

export function useApplyWeekPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignments: WeekPlanAssignment[]): Promise<number> => {
      const { data, error } = await supabase.rpc('apply_week_plan', {
        p_assignments: assignments as unknown as Json,
      });
      if (error) throw error;
      return data ?? 0;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout'] });
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
