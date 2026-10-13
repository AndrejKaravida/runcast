import { addDaysIso, startOfWeekIso } from '@/lib/dates';
import type { RunLogsRow, WorkoutsRow } from '@/types';

const RUN_TYPES = ['EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'RACE'];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function isRunWorkout(workout: WorkoutsRow): boolean {
  return RUN_TYPES.includes(workout.type);
}

export interface WeekProgress {
  plannedKm: number;
  doneKm: number;
  plannedSessions: number;
  doneSessions: number;
}

export function weekProgress(workouts: WorkoutsRow[]): WeekProgress {
  const runs = workouts.filter(isRunWorkout);
  const done = runs.filter((workout) => workout.status === 'DONE');
  return {
    plannedKm: round1(runs.reduce((sum, workout) => sum + workout.distance_km, 0)),
    doneKm: round1(done.reduce((sum, workout) => sum + workout.distance_km, 0)),
    plannedSessions: runs.length,
    doneSessions: done.length,
  };
}

export function runStreak(workouts: WorkoutsRow[], today: string): number {
  const statusesByDate = new Map<string, string[]>();
  for (const workout of workouts) {
    if (!isRunWorkout(workout)) continue;
    const statuses = statusesByDate.get(workout.workout_date) ?? [];
    statuses.push(workout.status);
    statusesByDate.set(workout.workout_date, statuses);
  }
  let streak = 0;
  for (let offset = 0; offset < 120; offset++) {
    const date = addDaysIso(today, -offset);
    const statuses = statusesByDate.get(date);
    if (!statuses) continue;
    if (statuses.includes('DONE')) {
      streak += 1;
      continue;
    }
    if (offset === 0) continue;
    break;
  }
  return streak;
}

export function nextWorkout(workouts: WorkoutsRow[], today: string): WorkoutsRow | null {
  const upcoming = workouts.filter(
    (workout) => workout.workout_date > today && isRunWorkout(workout) && workout.status === 'PLANNED',
  );
  return upcoming.sort((a, b) => a.workout_date.localeCompare(b.workout_date))[0] ?? null;
}

export function adherencePct(workouts: WorkoutsRow[], from: string, to: string): number {
  const runs = workouts.filter(
    (workout) => isRunWorkout(workout) && workout.workout_date >= from && workout.workout_date <= to,
  );
  if (runs.length === 0) return 0;
  return Math.round((runs.filter((workout) => workout.status === 'DONE').length / runs.length) * 100);
}

export function loggedKm(logs: RunLogsRow[]): number {
  return round1(logs.reduce((sum, log) => sum + (log.distance_km ?? 0), 0));
}

export interface WeekKm {
  week: string;
  planned: number;
  done: number;
}

export function weeklyKmSeries(workouts: WorkoutsRow[], today: string, weeksBack = 8): WeekKm[] {
  const map = new Map<string, { planned: number; done: number }>();
  for (const workout of workouts) {
    if (!isRunWorkout(workout)) continue;
    const week = startOfWeekIso(workout.workout_date);
    if (week > today) continue;
    const entry = map.get(week) ?? { planned: 0, done: 0 };
    entry.planned += workout.distance_km;
    if (workout.status === 'DONE') entry.done += workout.distance_km;
    map.set(week, entry);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-weeksBack)
    .map(([week, km]) => ({ week, planned: round1(km.planned), done: round1(km.done) }));
}
