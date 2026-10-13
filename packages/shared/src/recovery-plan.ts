import { addDays, weekdayOf } from './dates';
import { strengthWorkoutsForWeek } from './strength';
import type { WorkoutDraft } from './types';

export interface RecoveryPlanParams {
  startDate: string;
  runDays: number[];
}

const RECOVERY_WEEKS = 2;
const EASY_MINUTES: Record<number, number[]> = {
  1: [30, 35, 40],
  2: [40, 45, 50],
};

export function defaultRecoveryRunDays(daysPerWeek: number): number[] {
  return daysPerWeek >= 4 ? [1, 3, 5] : [1, 4];
}

function validateRunDays(runDays: number[]): void {
  if (runDays.length < 2 || runDays.length > 3) throw new Error('runDays must have 2 or 3 entries');
  if (new Set(runDays).size !== runDays.length) throw new Error('runDays must not contain duplicates');
  if (runDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6))
    throw new Error('runDays must contain weekday indices');
}

function easyDraft(date: string, minutes: number, weekIndex: number): WorkoutDraft {
  const durationSec = minutes * 60;
  return {
    date,
    type: 'EASY',
    title: `Lako trčanje ${minutes} min`,
    distanceKm: 0,
    durationSec,
    paceZone: 'E',
    steps: [{ label: `Lako trčanje ${minutes} min`, durationSec }],
    phase: 'BASE',
    weekIndex,
  };
}

function mobilityDraft(weekStart: string, weekIndex: number, runDays: number[]): WorkoutDraft | null {
  const [draft] = strengthWorkoutsForWeek({
    weekStart,
    weekIndex,
    phaseWeek: 0,
    phase: 'TAPER',
    daysPerWeek: 3,
    longRunDay: runDays[0],
    runDays,
    experience: 'first',
    isRaceWeek: false,
    daysToRace: 100,
  });
  return draft ? { ...draft, phase: 'BASE' } : null;
}

export function buildRecoveryPlan({ startDate, runDays }: RecoveryPlanParams): WorkoutDraft[] {
  validateRunDays(runDays);
  const startWeekday = weekdayOf(startDate);
  const entries = runDays
    .map((weekday) => ({ weekday, offset: (weekday - startWeekday + 7) % 7 }))
    .sort((a, b) => a.offset - b.offset);
  const workouts: WorkoutDraft[] = [];

  for (let week = 1; week <= RECOVERY_WEEKS; week++) {
    const weekStart = addDays(startDate, (week - 1) * 7);
    entries.forEach((entry, index) => {
      workouts.push(easyDraft(addDays(weekStart, entry.offset), EASY_MINUTES[week][index], week));
    });
    const mobility = mobilityDraft(weekStart, week, runDays);
    if (mobility) workouts.push(mobility);
  }

  return workouts.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}
