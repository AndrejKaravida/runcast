import { isRunType } from './types';

export interface HealthRun {
  date: string;
  distanceKm: number | null;
  durationSec: number;
  externalId: string;
  source: 'healthkit' | 'healthconnect';
  sourceName: string;
}

export interface HealthLogRef {
  log_date: string;
  distance_km: number | null;
  duration_sec: number | null;
}

export interface ImportContext {
  existing: HealthLogRef[];
  importedExternalIds: string[];
}

export interface WorkoutRef {
  id: string;
  workout_date: string;
  type: string;
  status: string;
}

const DISTANCE_TOLERANCE_KM = 0.05;
const DURATION_TOLERANCE_SEC = 60;

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function toLogDate(run: HealthRun, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date(run.date));
}

function runLogDate(run: HealthRun): string {
  return toLogDate(run, deviceTimeZone());
}

function durationMatches(run: HealthRun, log: HealthLogRef): boolean {
  if (log.duration_sec === null) return false;
  return Math.abs(log.duration_sec - run.durationSec) <= DURATION_TOLERANCE_SEC;
}

function distanceMatches(run: HealthRun, log: HealthLogRef): boolean {
  if (run.distanceKm === null || log.distance_km === null) return true;
  return Math.abs(log.distance_km - run.distanceKm) <= DISTANCE_TOLERANCE_KM + 1e-9;
}

export function classifyRun(run: HealthRun, context: ImportContext): 'import' | 'duplicate' | 'imported' {
  if (context.importedExternalIds.includes(run.externalId)) return 'imported';
  const logDate = runLogDate(run);
  for (const log of context.existing) {
    if (log.log_date !== logDate) continue;
    if (durationMatches(run, log) && distanceMatches(run, log)) return 'duplicate';
  }
  return 'import';
}

export function matchWorkoutId(run: HealthRun, workouts: WorkoutRef[]): string | null {
  const logDate = runLogDate(run);
  const candidates = workouts.filter(
    (workout) =>
      workout.workout_date === logDate &&
      (workout.status === 'PLANNED' || workout.status === 'DONE') &&
      isRunType(workout.type),
  );
  return candidates.length === 1 ? candidates[0].id : null;
}
