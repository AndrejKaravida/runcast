import { addDays, dayDiff, startOfWeek } from './dates';
import type { WorkoutStatus, WorkoutType } from './types';

export interface RebalanceWorkout {
  id: string;
  date: string;
  type: WorkoutType;
  status: WorkoutStatus;
}

export interface WeekPlanAdjustments {
  skips: string[];
  moves: { id: string; newDate: string }[];
}

export interface RebalanceWeekParams {
  workouts: RebalanceWorkout[];
  today: string;
  longRunDay: number;
  raceDate: string;
}

const QUALITY_TYPES: ReadonlySet<WorkoutType> = new Set(['TEMPO', 'INTERVALS', 'REPETITIONS']);
const MIN_GAP_DISTANCE = 2;
const PREFERRED_GAP_DISTANCE = 3;

function byDateThenId(a: RebalanceWorkout, b: RebalanceWorkout): number {
  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
}

function nearestDay(days: string[], target: string): string {
  return [...days].sort((a, b) => Math.abs(dayDiff(target, a)) - Math.abs(dayDiff(target, b)) || a.localeCompare(b))[0];
}

function keepsDistance(day: string, anchors: string[], minDistance: number): boolean {
  return anchors.every((anchor) => Math.abs(dayDiff(anchor, day)) >= minDistance);
}

function pickDay(pool: string[], anchors: string[]): string {
  const preferred = pool.filter((day) => keepsDistance(day, anchors, PREFERRED_GAP_DISTANCE));
  if (preferred.length > 0) return preferred[0];
  const tolerated = pool.filter((day) => keepsDistance(day, anchors, MIN_GAP_DISTANCE));
  if (tolerated.length > 0) return tolerated[0];
  return pool[0];
}

export function missedPlannedWorkouts(workouts: RebalanceWorkout[], today: string): RebalanceWorkout[] {
  return workouts
    .filter((workout) => workout.status === 'PLANNED' && workout.type !== 'REST' && workout.date < today)
    .sort(byDateThenId);
}

export function placeWeekWorkouts(
  workouts: RebalanceWorkout[],
  windowStart: string,
  weekStart: string,
  windowEnd: string,
  longRunDay: number,
): WeekPlanAdjustments['moves'] {
  const windowDays: string[] = [];
  for (let day = windowStart; day <= windowEnd; day = addDays(day, 1)) windowDays.push(day);

  const blocked = new Set(
    workouts
      .filter(
        (workout) =>
          (workout.status !== 'PLANNED' || workout.type === 'RACE') &&
          workout.date >= windowStart &&
          workout.date <= windowEnd,
      )
      .map((workout) => workout.date),
  );

  const movable = workouts
    .filter(
      (workout) =>
        workout.status === 'PLANNED' &&
        workout.type !== 'RACE' &&
        workout.date >= windowStart &&
        workout.date <= windowEnd,
    )
    .sort(byDateThenId);

  const free = windowDays.filter((day) => !blocked.has(day));
  const assignment = new Map<string, string>();
  const longRun = movable.find((workout) => workout.type === 'LONG') ?? null;

  if (longRun && free.length > 0) {
    const designated = addDays(weekStart, longRunDay);
    const target =
      designated >= windowStart && designated <= windowEnd && !blocked.has(designated)
        ? designated
        : nearestDay(free, designated);
    assignment.set(longRun.id, target);
    free.splice(free.indexOf(target), 1);
  }

  const qualityAnchors: string[] = [];
  const longRunDate = longRun ? assignment.get(longRun.id) : null;
  if (longRunDate) qualityAnchors.push(longRunDate);

  let cursor: string | null = null;

  for (const workout of movable) {
    if (workout.id === longRun?.id) continue;
    const isQuality = QUALITY_TYPES.has(workout.type);
    const keepsOriginal =
      free.includes(workout.date) &&
      (cursor === null || workout.date > cursor) &&
      (!isQuality || keepsDistance(workout.date, qualityAnchors, MIN_GAP_DISTANCE));

    let chosen: string;
    if (keepsOriginal) {
      chosen = workout.date;
    } else {
      const candidates = free.filter((day) => cursor === null || day > cursor);
      const pool = candidates.length > 0 ? candidates : free;
      chosen = pool.length > 0 ? pickDay(pool, qualityAnchors) : workout.date;
    }

    assignment.set(workout.id, chosen);
    const index = free.indexOf(chosen);
    if (index >= 0) free.splice(index, 1);
    cursor = chosen;
    if (isQuality) qualityAnchors.push(chosen);
  }

  const moves = movable
    .filter((workout) => {
      const newDate = assignment.get(workout.id);
      return newDate !== undefined && newDate !== workout.date;
    })
    .map((workout) => ({ id: workout.id, newDate: assignment.get(workout.id) as string }));

  return moves;
}

export function planWeekAdjustments({
  workouts,
  today,
  longRunDay,
  raceDate,
}: RebalanceWeekParams): WeekPlanAdjustments {
  const skips = missedPlannedWorkouts(workouts, today).map((workout) => workout.id);

  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const windowEnd = weekEnd < raceDate ? weekEnd : raceDate;

  return { skips, moves: placeWeekWorkouts(workouts, today, weekStart, windowEnd, longRunDay) };
}
