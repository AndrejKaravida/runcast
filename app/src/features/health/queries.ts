import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import {
  classifyRun,
  computeReadiness,
  matchWorkoutId,
  toLogDate,
  type Readiness,
  type ReadinessBaseline,
  type ReadinessSnapshot,
  type WorkoutRef,
} from '@runcast/shared';
import { useAuth } from '@/auth/AuthProvider';
import { getHealthSource, type HealthAvailability } from '@/features/health/adapter';
import { invalidateWorkoutData } from '@/features/logs/queries';
import { addDaysIso, deviceTimeZone, localMidnightInstant, todayIso } from '@/lib/dates';
import { isNativePlatform } from '@/lib/native';
import { supabase } from '@/lib/supabase';
import type { RunLogsInsert } from '@/types';

const AUTOSYNC_KEY = 'runcast.health.autosync';
const LAST_SYNC_KEY = 'runcast.health.lastSync';
const HISTORY_DAYS = 90;
const INSERT_BATCH_SIZE = 100;
const READINESS_AUTOSYNC_KEY = 'runcast.readiness.autosync';
const READINESS_HISTORY_KEY = 'runcast.readiness.history';
const READINESS_HISTORY_DAYS = 28;
const READINESS_BASELINE_DAYS = 14;
const READINESS_LOOKBACK_HOURS = 20;
const READINESS_STALE_MS = 5 * 60_000;

export interface HealthLastSync {
  at: string;
  imported: number;
  skipped: number;
}

export interface HealthImportResult {
  fetched: number;
  imported: number;
  linked: number;
  skipped: number;
}

export function readHealthAutosync(): boolean {
  try {
    return localStorage.getItem(AUTOSYNC_KEY) === 'on';
  } catch {
    return false;
  }
}

export function writeHealthAutosync(value: boolean): void {
  try {
    localStorage.setItem(AUTOSYNC_KEY, value ? 'on' : 'off');
  } catch {
    return;
  }
}

export function readHealthLastSync(): HealthLastSync | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HealthLastSync>;
    if (typeof parsed.at !== 'string') return null;
    return {
      at: parsed.at,
      imported: Number(parsed.imported) || 0,
      skipped: Number(parsed.skipped) || 0,
    };
  } catch {
    return null;
  }
}

function writeHealthLastSync(value: HealthLastSync): void {
  try {
    localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(value));
  } catch {
    return;
  }
}

export function useHealthIntegration() {
  const [available, setAvailable] = useState<HealthAvailability | null>(null);
  const [autosync, setAutosync] = useState(readHealthAutosync);
  const [lastSync, setLastSync] = useState(readHealthLastSync);

  useEffect(() => {
    let cancelled = false;
    void getHealthSource()
      .isAvailable()
      .then((value) => {
        if (!cancelled) setAvailable(value);
      })
      .catch(() => {
        if (!cancelled) setAvailable('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateAutosync = useCallback((value: boolean) => {
    writeHealthAutosync(value);
    setAutosync(value);
  }, []);

  const refreshLastSync = useCallback(() => setLastSync(readHealthLastSync()), []);

  return { available, autosync, lastSync, updateAutosync, refreshLastSync };
}

export function useImportHealthRuns() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<HealthImportResult> => {
      if (!userId) throw new Error('No session');
      const source = getHealthSource();
      const lastSync = readHealthLastSync();
      const at = new Date().toISOString();
      const since = lastSync?.at ?? localMidnightInstant(addDaysIso(todayIso(), -HISTORY_DAYS));
      const runs = await source.fetchRuns(since);

      const { data: logs, error: logsError } = await supabase
        .from('run_logs')
        .select('log_date, distance_km, duration_sec, external_id')
        .eq('user_id', userId)
        .limit(300);
      if (logsError) throw logsError;

      const existing = logs.map(({ log_date, distance_km, duration_sec }) => ({
        log_date,
        distance_km,
        duration_sec,
      }));
      const importedExternalIds = logs
        .map((log) => log.external_id)
        .filter((externalId): externalId is string => Boolean(externalId));
      const timeZone = deviceTimeZone();
      const toImport = runs.filter((run) => classifyRun(run, { existing, importedExternalIds }, timeZone) === 'import');

      let linked = 0;
      if (toImport.length > 0) {
        const { data: plan, error: planError } = await supabase
          .from('plans')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (planError) throw planError;

        let workouts: WorkoutRef[] = [];
        if (plan) {
          const { data, error } = await supabase
            .from('workouts')
            .select('id, workout_date, type, status')
            .eq('user_id', userId)
            .eq('plan_id', plan.id);
          if (error) throw error;
          workouts = data;
        }

        const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
        const plannedIds: string[] = [];
        const rows: RunLogsInsert[] = toImport.map((run) => {
          const workoutId = matchWorkoutId(run, workouts, timeZone);
          if (workoutId && workoutById.get(workoutId)?.status === 'PLANNED') plannedIds.push(workoutId);
          return {
            user_id: userId,
            workout_id: workoutId,
            log_date: toLogDate(run, timeZone),
            distance_km: run.distanceKm,
            duration_sec: run.durationSec,
            avg_pace_sec_per_km:
              run.distanceKm && run.distanceKm > 0 ? Math.round(run.durationSec / run.distanceKm) : null,
            notes: `Uvezeno: ${run.sourceName}`,
            external_id: run.externalId,
          };
        });

        for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
          const { error } = await supabase.from('run_logs').insert(rows.slice(index, index + INSERT_BATCH_SIZE));
          if (error) throw error;
        }

        if (plannedIds.length > 0) {
          const { error } = await supabase.from('workouts').update({ status: 'DONE' }).in('id', plannedIds);
          if (error) throw error;
          linked = plannedIds.length;
        }
      }

      if (runs.length > 0) {
        writeHealthLastSync({ at, imported: toImport.length, skipped: runs.length - toImport.length });
      }

      return { fetched: runs.length, imported: toImport.length, linked, skipped: runs.length - toImport.length };
    },
    onSuccess: () => invalidateWorkoutData(queryClient),
  });
}

let autoImportInFlight = false;

export function useHealthAutoImport() {
  const { session } = useAuth();
  const { mutateAsync: importRuns } = useImportHealthRuns();

  useEffect(() => {
    if (!session) return;
    const attempt = () => {
      if (autoImportInFlight || !readHealthAutosync() || !readHealthLastSync()) return;
      autoImportInFlight = true;
      void importRuns()
        .catch(() => undefined)
        .finally(() => {
          autoImportInFlight = false;
        });
    };
    attempt();
    if (!isNativePlatform()) return;
    let remove: (() => void) | undefined;
    void import('@capacitor/app')
      .then(async ({ App }) => {
        const listener = await App.addListener('resume', attempt);
        remove = () => {
          void listener.remove();
        };
      })
      .catch(() => undefined);
    return () => remove?.();
  }, [session, importRuns]);
}

export function readReadinessAutosync(): boolean {
  try {
    return localStorage.getItem(READINESS_AUTOSYNC_KEY) === 'on';
  } catch {
    return false;
  }
}

export function writeReadinessAutosync(value: boolean): void {
  try {
    localStorage.setItem(READINESS_AUTOSYNC_KEY, value ? 'on' : 'off');
  } catch {
    return;
  }
}

interface ReadinessHistoryEntry {
  date: string;
  sleepHours: number | null;
  restingHr: number | null;
  hrv: number | null;
}

export interface ReadinessData {
  snapshot: ReadinessSnapshot;
  readiness: Readiness;
}

function readReadinessHistory(): ReadinessHistoryEntry[] {
  try {
    const raw = localStorage.getItem(READINESS_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReadinessHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry?.date === 'string');
  } catch {
    return [];
  }
}

function writeReadinessHistory(history: ReadinessHistoryEntry[]): void {
  try {
    localStorage.setItem(READINESS_HISTORY_KEY, JSON.stringify(history));
  } catch {
    return;
  }
}

function recordReadiness(history: ReadinessHistoryEntry[], entry: ReadinessHistoryEntry): ReadinessHistoryEntry[] {
  const oldest = addDaysIso(entry.date, -(READINESS_HISTORY_DAYS - 1));
  return [...history.filter((item) => item.date !== entry.date && item.date >= oldest), entry].sort((first, second) =>
    first.date.localeCompare(second.date),
  );
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function readinessBaseline(history: ReadinessHistoryEntry[], today: string): ReadinessBaseline | null {
  const previous = history.filter((entry) => entry.date < today);
  if (previous.length < READINESS_BASELINE_DAYS) return null;
  return {
    rhrAvg: average(previous.flatMap((entry) => (entry.restingHr === null ? [] : [entry.restingHr]))),
    hrvAvg: average(previous.flatMap((entry) => (entry.hrv === null ? [] : [entry.hrv]))),
  };
}

async function fetchReadinessData(): Promise<ReadinessData | null> {
  const sinceIso = new Date(Date.now() - READINESS_LOOKBACK_HOURS * 3_600_000).toISOString();
  const snapshot = await getHealthSource().fetchReadiness(sinceIso);
  if (!snapshot) return null;
  if (snapshot.sleepHours === null && snapshot.restingHr === null && snapshot.hrv === null) return null;

  const today = todayIso();
  const history = recordReadiness(readReadinessHistory(), {
    date: today,
    sleepHours: snapshot.sleepHours,
    restingHr: snapshot.restingHr,
    hrv: snapshot.hrv,
  });
  writeReadinessHistory(history);

  return {
    snapshot,
    readiness: computeReadiness({
      sleepHours: snapshot.sleepHours,
      restingHr: snapshot.restingHr,
      hrv: snapshot.hrv,
      baseline: readinessBaseline(history, today),
    }),
  };
}

export function useReadiness() {
  const [autosync] = useState(readReadinessAutosync);
  const query = useQuery<ReadinessData | null>({
    queryKey: ['readiness'],
    enabled: autosync,
    queryFn: fetchReadinessData,
    staleTime: READINESS_STALE_MS,
  });
  return { data: query.data, isLoading: query.isLoading, autosync };
}
