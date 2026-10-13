import type { HourlyForecast } from './weather';
import { isRunType, type LocalizedText, type RunWindow, type WorkoutStatus, type WorkoutType } from './types';
import { swapCandidates, runWindowHours, WEATHER_RULES } from './weather-rules';
import { addDays, dayDiff, startOfWeek } from './dates';

export interface WindowScore {
  score: number;
  precipPct: number;
  precipMm: number;
  apparentC: number;
  windGust: number;
  pm25: number;
}

export interface RescheduleWorkout {
  id: string;
  date: string;
  type: WorkoutType;
  status: WorkoutStatus;
}

export interface RescheduleSwapOption {
  kind: 'swap';
  workoutId: string;
  date: string;
  score: number;
  text: LocalizedText;
}

export interface RescheduleShiftOption {
  kind: 'shift';
  window: 'morning' | 'evening';
  score: number;
  text: LocalizedText;
}

export interface RescheduleIndoorOption {
  kind: 'indoor';
  text: LocalizedText;
}

export type RescheduleOption = RescheduleSwapOption | RescheduleShiftOption | RescheduleIndoorOption;

export interface RescheduleSuggestion {
  todayScore: number;
  options: RescheduleOption[];
}

export interface RescheduleParams {
  workout: { id: string; type: WorkoutType; status: WorkoutStatus };
  weekWorkouts: RescheduleWorkout[];
  hours: HourlyForecast[];
  pm25: { time: string; pm25: number }[];
  runWindow: RunWindow;
  today: string;
}

export const RESCHEDULE_GOOD_SCORE = 55;
const QUALITY_TYPES: ReadonlySet<WorkoutType> = new Set(['LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS']);

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function hourOf(time: string): number {
  return Number(time.slice(11, 13));
}

function inWindow(time: string, date: string, window: { startHour: number; endHour: number }): boolean {
  return time.startsWith(date) && hourOf(time) >= window.startHour && hourOf(time) < window.endHour;
}

export function scoreWindow(
  hours: HourlyForecast[],
  pm25: { time: string; pm25: number }[],
  window: { startHour: number; endHour: number },
  date: string,
): WindowScore {
  const windowHours = hours.filter((hour) => inWindow(hour.time, date, window));
  if (windowHours.length === 0) {
    return { score: 0, precipPct: 0, precipMm: 0, apparentC: 0, windGust: 0, pm25: 0 };
  }
  const precipPct = Math.max(...windowHours.map((hour) => hour.precipProbabilityPct));
  const precipMm = round1(windowHours.reduce((sum, hour) => sum + hour.precipMm, 0));
  const apparentC = Math.round(Math.max(...windowHours.map((hour) => hour.apparentC)));
  const minApparent = Math.min(...windowHours.map((hour) => hour.apparentC));
  const windGust = Math.round(Math.max(...windowHours.map((hour) => hour.windGustKmh)));
  const pmRows = pm25.filter((row) => inWindow(row.time, date, window));
  const pm25Max = pmRows.length > 0 ? Math.round(Math.max(...pmRows.map((row) => row.pm25))) : 0;
  if (windowHours.some((hour) => hour.weatherCode >= 95)) {
    return { score: 0, precipPct, precipMm, apparentC, windGust, pm25: pm25Max };
  }
  const penalty =
    Math.min(55, precipPct * 0.6) +
    Math.min(35, precipMm * 8) +
    Math.min(30, Math.max(0, apparentC - (WEATHER_RULES.heatApparentC - 12)) * 2.5) +
    Math.min(30, Math.max(0, WEATHER_RULES.coldApparentC + 12 - minApparent) * 2.5) +
    Math.min(20, Math.max(0, windGust - 25) * 1.5) +
    Math.min(30, Math.max(0, pm25Max - (WEATHER_RULES.pm25 - 20)));
  return { score: Math.max(0, Math.round(100 - penalty)), precipPct, precipMm, apparentC, windGust, pm25: pm25Max };
}

function createsQualityAdjacency(
  targetId: string,
  targetType: WorkoutType,
  candidateDate: string,
  weekWorkouts: RescheduleWorkout[],
): boolean {
  if (!QUALITY_TYPES.has(targetType)) return false;
  const neighbors = new Set([addDays(candidateDate, -1), addDays(candidateDate, 1)]);
  return weekWorkouts.some(
    (workout) => workout.id !== targetId && neighbors.has(workout.date) && QUALITY_TYPES.has(workout.type),
  );
}

type AlternativeWindow = { window: 'morning' | 'evening'; startHour: number; endHour: number };

function alternativeWindows(runWindow: RunWindow): AlternativeWindow[] {
  if (runWindow === 'morning') return [{ window: 'evening', ...runWindowHours('evening') }];
  if (runWindow === 'evening') return [{ window: 'morning', ...runWindowHours('morning') }];
  return [
    { window: 'morning', ...runWindowHours('morning') },
    { window: 'evening', ...runWindowHours('evening') },
  ];
}

export function suggestReschedule(params: RescheduleParams): RescheduleSuggestion {
  const window = runWindowHours(params.runWindow);
  const todayScore = scoreWindow(params.hours, params.pm25, window, params.today).score;
  if (
    params.workout.status !== 'PLANNED' ||
    !isRunType(params.workout.type) ||
    params.workout.type === 'RACE' ||
    !params.hours.some((hour) => inWindow(hour.time, params.today, window))
  ) {
    return { todayScore, options: [] };
  }

  const weekStart = startOfWeek(params.today);
  const pool = swapCandidates(
    { id: params.workout.id, date: params.today, type: params.workout.type, status: params.workout.status },
    params.weekWorkouts,
    weekStart,
  );
  const swapOptions: RescheduleSwapOption[] = pool
    .filter(
      (candidate) =>
        !createsQualityAdjacency(params.workout.id, params.workout.type, candidate.date, params.weekWorkouts),
    )
    .map((candidate) => ({ candidate, scored: scoreWindow(params.hours, params.pm25, window, candidate.date) }))
    .sort(
      (a, b) =>
        b.scored.score - a.scored.score ||
        dayDiff(params.today, a.candidate.date) - dayDiff(params.today, b.candidate.date) ||
        a.candidate.date.localeCompare(b.candidate.date),
    )
    .slice(0, 3)
    .map(({ candidate, scored }) => ({
      kind: 'swap' as const,
      workoutId: candidate.id,
      date: candidate.date,
      score: scored.score,
      text: { key: 'content:reschedule.reason', params: { pct: scored.precipPct, temp: scored.apparentC } },
    }));

  const [bestAlternative] = alternativeWindows(params.runWindow)
    .map((other) => ({ ...other, scored: scoreWindow(params.hours, params.pm25, other, params.today) }))
    .sort((a, b) => b.scored.score - a.scored.score);
  const bestSwap = swapOptions[0] ?? null;
  const shiftOption: RescheduleShiftOption | null =
    bestAlternative &&
    bestAlternative.scored.score > todayScore &&
    (!bestSwap || bestAlternative.scored.score > bestSwap.score)
      ? {
          kind: 'shift',
          window: bestAlternative.window,
          score: bestAlternative.scored.score,
          text: {
            key: `content:reschedule.shift.${bestAlternative.window}`,
            params: { pct: bestAlternative.scored.precipPct, temp: bestAlternative.scored.apparentC },
          },
        }
      : null;

  const hasGoodSwap = swapOptions.some((option) => option.score >= RESCHEDULE_GOOD_SCORE);
  const swapCap = hasGoodSwap ? (shiftOption ? 2 : 3) : shiftOption ? 1 : 2;
  const options: RescheduleOption[] = [
    ...(shiftOption ? [shiftOption] : []),
    ...swapOptions.slice(0, swapCap),
    ...(hasGoodSwap ? [] : [{ kind: 'indoor' as const, text: { key: 'content:reschedule.indoor' } }]),
  ];
  return { todayScore, options };
}
