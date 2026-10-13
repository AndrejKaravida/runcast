import { addDays, startOfWeek } from './dates';
import { STANDARD_RACE_KM } from './predict';
import type { LocalizedText, WorkoutStatus, WorkoutType } from './types';

export type AchievementFamily =
  'first' | 'sessions' | 'streakWeeks' | 'long' | 'tempo' | 'km' | 'race' | 'strength' | 'pb';

export const ACHIEVEMENT_FAMILIES = [
  'first',
  'sessions',
  'streakWeeks',
  'long',
  'tempo',
  'km',
  'race',
  'strength',
  'pb',
] as const satisfies readonly AchievementFamily[];

export type AchievementTier = 1 | 2 | 3 | 4;

export interface AchievementWorkout {
  id: string;
  workout_date: string;
  type: WorkoutType;
  status: WorkoutStatus;
  distance_km: number;
}

export interface AchievementLog {
  workout_id: string | null;
  log_date: string;
  distance_km: number | null;
  duration_sec: number | null;
}

export interface AchievementProfile {
  experience: string | null;
  volume_band: string | null;
}

export interface Achievement {
  id: string;
  family: AchievementFamily;
  tier: AchievementTier;
  title: LocalizedText;
  description: LocalizedText;
  unlockedAt: string | null;
  progress: { current: number; target: number };
}

export interface WeeklyChallenge {
  weekStart: string;
  done: number;
  target: number;
  longPlanned: boolean;
  longDone: boolean;
  complete: boolean;
  sessionsText: LocalizedText;
  longText: LocalizedText | null;
}

export interface AchievementsInput {
  workouts: readonly AchievementWorkout[];
  logs: readonly AchievementLog[];
  profile: AchievementProfile | null;
  today: string;
}

const RUN_TYPES: readonly WorkoutType[] = ['EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'RACE'];
const DISTANCE_TOLERANCE = 0.004;
const MIN_DISTANCE_KM = 3;

const FAMILY_LEVELS: Record<AchievementFamily, ReadonlyArray<{ target: number; tier: AchievementTier }>> = {
  first: [{ target: 1, tier: 2 }],
  sessions: [
    { target: 5, tier: 1 },
    { target: 10, tier: 2 },
    { target: 25, tier: 3 },
    { target: 50, tier: 4 },
  ],
  streakWeeks: [
    { target: 4, tier: 1 },
    { target: 8, tier: 2 },
    { target: 12, tier: 3 },
  ],
  long: [
    { target: 10, tier: 1 },
    { target: 15, tier: 2 },
    { target: 20, tier: 3 },
    { target: 30, tier: 4 },
  ],
  tempo: [{ target: 1, tier: 2 }],
  km: [
    { target: 100, tier: 1 },
    { target: 250, tier: 2 },
    { target: 500, tier: 3 },
    { target: 1000, tier: 4 },
  ],
  race: [{ target: 1, tier: 3 }],
  strength: [{ target: 10, tier: 2 }],
  pb: [{ target: 1, tier: 3 }],
};

function titleFor(family: AchievementFamily, target: number): LocalizedText {
  switch (family) {
    case 'first':
      return { key: 'content:achievements.first.title' };
    case 'sessions':
      return { key: 'content:achievements.sessions.title', params: { count: target } };
    case 'streakWeeks':
      return { key: 'content:achievements.streakWeeks.title', params: { weeks: target } };
    case 'long':
      return { key: 'content:achievements.long.title', params: { km: target } };
    case 'tempo':
      return { key: 'content:achievements.tempo.title' };
    case 'km':
      return { key: 'content:achievements.km.title', params: { km: target } };
    case 'race':
      return { key: 'content:achievements.race.title' };
    case 'strength':
      return { key: 'content:achievements.strength.title' };
    case 'pb':
      return { key: 'content:achievements.pb.title' };
  }
}

function descriptionFor(family: AchievementFamily, target: number): LocalizedText {
  switch (family) {
    case 'first':
      return { key: 'content:achievements.first.description' };
    case 'sessions':
      return { key: 'content:achievements.sessions.description', params: { count: target } };
    case 'streakWeeks':
      return { key: 'content:achievements.streakWeeks.description', params: { weeks: target } };
    case 'long':
      return { key: 'content:achievements.long.description', params: { km: target } };
    case 'tempo':
      return { key: 'content:achievements.tempo.description' };
    case 'km':
      return { key: 'content:achievements.km.description', params: { km: target } };
    case 'race':
      return { key: 'content:achievements.race.description' };
    case 'strength':
      return { key: 'content:achievements.strength.description' };
    case 'pb':
      return { key: 'content:achievements.pb.description' };
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function sortWorkouts(workouts: readonly AchievementWorkout[]): AchievementWorkout[] {
  return [...workouts].sort((a, b) => a.workout_date.localeCompare(b.workout_date) || a.id.localeCompare(b.id));
}

function doneWorkouts(
  workouts: readonly AchievementWorkout[],
  types: readonly WorkoutType[],
  today: string,
): AchievementWorkout[] {
  return sortWorkouts(
    workouts.filter(
      (workout) => workout.status === 'DONE' && types.includes(workout.type) && workout.workout_date <= today,
    ),
  );
}

interface LongEntry {
  km: number;
  date: string;
}

function longEntries(
  workouts: readonly AchievementWorkout[],
  logs: readonly AchievementLog[],
  today: string,
): LongEntry[] {
  const logsByWorkout = new Map<string, AchievementLog[]>();
  for (const log of logs) {
    if (log.workout_id === null || log.distance_km === null) continue;
    if (!Number.isFinite(log.distance_km) || log.distance_km <= 0 || log.log_date > today) continue;
    const list = logsByWorkout.get(log.workout_id) ?? [];
    list.push(log);
    logsByWorkout.set(log.workout_id, list);
  }
  return workouts.map((workout) => {
    const linked = logsByWorkout.get(workout.id);
    if (!linked || linked.length === 0) return { km: workout.distance_km, date: workout.workout_date };
    let best = linked[0];
    for (const log of linked) {
      const bestKm = best.distance_km as number;
      const logKm = log.distance_km as number;
      if (logKm > bestKm || (logKm === bestKm && log.log_date > best.log_date)) best = log;
    }
    return { km: best.distance_km as number, date: best.log_date };
  });
}

interface KmFacts {
  total: number;
  unlocks: Map<number, string>;
}

function kmFacts(logs: readonly AchievementLog[], today: string): KmFacts {
  const sorted = logs
    .filter(
      (log) =>
        log.log_date <= today && log.distance_km !== null && Number.isFinite(log.distance_km) && log.distance_km > 0,
    )
    .sort((a, b) => a.log_date.localeCompare(b.log_date));
  const unlocks = new Map<number, string>();
  let total = 0;
  for (const log of sorted) {
    total += log.distance_km as number;
    for (const level of FAMILY_LEVELS.km) {
      if (!unlocks.has(level.target) && total >= level.target) unlocks.set(level.target, log.log_date);
    }
  }
  return { total: round1(total), unlocks };
}

interface StreakFacts {
  streak: number;
  firstDates: string[];
}

function weekStreak(runs: readonly AchievementWorkout[], today: string): StreakFacts {
  const firstDateByWeek = new Map<string, string>();
  for (const workout of runs) {
    const week = startOfWeek(workout.workout_date);
    if (!firstDateByWeek.has(week)) firstDateByWeek.set(week, workout.workout_date);
  }
  const currentWeek = startOfWeek(today);
  let cursor = firstDateByWeek.has(currentWeek) ? currentWeek : addDays(currentWeek, -7);
  const firstDates: string[] = [];
  while (firstDateByWeek.has(cursor)) {
    firstDates.push(firstDateByWeek.get(cursor) as string);
    cursor = addDays(cursor, -7);
  }
  return { streak: firstDates.length, firstDates };
}

function pbUnlock(logs: readonly AchievementLog[], today: string): string | null {
  const sorted = logs
    .filter(
      (log) =>
        log.log_date <= today &&
        log.distance_km !== null &&
        log.duration_sec !== null &&
        Number.isFinite(log.distance_km) &&
        Number.isFinite(log.duration_sec) &&
        log.distance_km >= MIN_DISTANCE_KM &&
        log.duration_sec > 0,
    )
    .sort((a, b) => a.log_date.localeCompare(b.log_date));
  const bestByDistance = new Map<number, number>();
  let unlockedAt: string | null = null;
  for (const log of sorted) {
    const distance = log.distance_km as number;
    const timeSec = log.duration_sec as number;
    for (const distanceKm of STANDARD_RACE_KM) {
      if (Math.abs(distance - distanceKm) > distanceKm * DISTANCE_TOLERANCE) continue;
      const previous = bestByDistance.get(distanceKm);
      if (previous !== undefined && timeSec < previous && unlockedAt === null) unlockedAt = log.log_date;
      if (previous === undefined || timeSec < previous) bestByDistance.set(distanceKm, timeSec);
    }
  }
  return unlockedAt;
}

export function computeAchievements(input: AchievementsInput): Achievement[] {
  const { workouts, logs, today } = input;
  const runs = doneWorkouts(workouts, RUN_TYPES, today);
  const runDates = runs.map((workout) => workout.workout_date);
  const strengthDates = doneWorkouts(workouts, ['STRENGTH'], today).map((workout) => workout.workout_date);
  const tempoDates = runs.filter((workout) => workout.type === 'TEMPO').map((workout) => workout.workout_date);
  const raceDates = runs.filter((workout) => workout.type === 'RACE').map((workout) => workout.workout_date);
  const longRuns = longEntries(doneWorkouts(workouts, ['LONG'], today), logs, today);
  const longMax = longRuns.reduce((max, entry) => Math.max(max, entry.km), 0);
  const km = kmFacts(logs, today);
  const streak = weekStreak(runs, today);
  const pbDate = pbUnlock(logs, today);

  function resolveLevel(family: AchievementFamily, target: number): { current: number; unlockedAt: string | null } {
    switch (family) {
      case 'first':
      case 'sessions':
        return { current: runs.length, unlockedAt: target <= runDates.length ? runDates[target - 1] : null };
      case 'streakWeeks':
        return {
          current: streak.streak,
          unlockedAt: target <= streak.streak ? streak.firstDates[target - 1] : null,
        };
      case 'long':
        return {
          current: round1(longMax),
          unlockedAt: longRuns.find((entry) => entry.km >= target)?.date ?? null,
        };
      case 'tempo':
        return { current: tempoDates.length, unlockedAt: target <= tempoDates.length ? tempoDates[target - 1] : null };
      case 'km':
        return { current: km.total, unlockedAt: km.unlocks.get(target) ?? null };
      case 'race':
        return { current: raceDates.length, unlockedAt: target <= raceDates.length ? raceDates[target - 1] : null };
      case 'strength':
        return {
          current: strengthDates.length,
          unlockedAt: target <= strengthDates.length ? strengthDates[target - 1] : null,
        };
      case 'pb':
        return { current: pbDate ? 1 : 0, unlockedAt: pbDate };
    }
  }

  const achievements: Achievement[] = [];
  for (const family of ACHIEVEMENT_FAMILIES) {
    for (const level of FAMILY_LEVELS[family]) {
      const { current, unlockedAt } = resolveLevel(family, level.target);
      achievements.push({
        id: `${family}.${level.target}`,
        family,
        tier: level.tier,
        title: titleFor(family, level.target),
        description: descriptionFor(family, level.target),
        unlockedAt,
        progress: { current: Math.min(current, level.target), target: level.target },
      });
    }
  }
  return achievements;
}

export function weeklyChallenge(
  plan: { start_date: string; race_date: string },
  workouts: readonly AchievementWorkout[],
  today: string,
): WeeklyChallenge | null {
  if (today < plan.start_date || today > plan.race_date) return null;
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const runs = workouts.filter(
    (workout) =>
      RUN_TYPES.includes(workout.type) && workout.workout_date >= weekStart && workout.workout_date <= weekEnd,
  );
  if (runs.length === 0) return null;
  const done = runs.filter((workout) => workout.status === 'DONE').length;
  const longPlanned = runs.some((workout) => workout.type === 'LONG');
  const longDone = runs.some((workout) => workout.type === 'LONG' && workout.status === 'DONE');
  return {
    weekStart,
    done,
    target: runs.length,
    longPlanned,
    longDone,
    complete: done >= runs.length,
    sessionsText: { key: 'content:achievements.challenge.sessions', params: { done, target: runs.length } },
    longText: longPlanned
      ? { key: longDone ? 'content:achievements.challenge.longDone' : 'content:achievements.challenge.longPlanned' }
      : null,
  };
}
