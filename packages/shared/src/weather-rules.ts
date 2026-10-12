import type { HourlyForecast } from './weather';
import type { RunWindow, WorkoutStatus, WorkoutType } from './types';

export const WEATHER_RULES = {
  rainProbabilityPct: 60,
  rainMm: 2,
  heatApparentC: 30,
  coldApparentC: -5,
  windKmh: 40,
  pm25: 55,
} as const;

export interface WeatherAssessment {
  code: 'STORM' | 'RAIN' | 'HEAT' | 'COLD' | 'WIND' | 'AIR' | null;
  severity: 'none' | 'info' | 'warn' | 'swap';
  suggestion: 'keep' | 'swap' | 'indoor' | 'earlier';
  details: Record<string, number | string>;
}

export interface SwapCandidate {
  id: string;
  date: string;
  type: WorkoutType;
}

const MS_PER_DAY = 86_400_000;

export function runWindowHours(runWindow: RunWindow): { startHour: number; endHour: number } {
  if (runWindow === 'morning') return { startHour: 6, endHour: 9 };
  if (runWindow === 'evening') return { startHour: 17, endHour: 21 };
  return { startHour: 6, endHour: 21 };
}

function hourOf(time: string): number {
  return Number(time.slice(11, 13));
}

function isRunningType(type: WorkoutType): boolean {
  return type === 'EASY' || type === 'LONG' || type === 'TEMPO' || type === 'INTERVALS' || type === 'REPETITIONS';
}

export function assessWorkoutWeather(params: {
  type: WorkoutType;
  hours: HourlyForecast[];
  pm25: { time: string; pm25: number }[];
  windowStartHour: number;
  windowEndHour: number;
  date: string;
}): WeatherAssessment {
  const windowHours = params.hours.filter(
    (hour) =>
      hour.time.startsWith(params.date) &&
      hourOf(hour.time) >= params.windowStartHour &&
      hourOf(hour.time) < params.windowEndHour,
  );
  if (windowHours.length === 0) {
    return { code: null, severity: 'info', suggestion: 'keep', details: { info: 'no-hours' } };
  }
  if (params.type === 'REST') {
    return { code: null, severity: 'info', suggestion: 'keep', details: { info: 'rest-day' } };
  }

  const isRace = params.type === 'RACE';

  const storm = windowHours.find((hour) => hour.weatherCode >= 95);
  if (storm) {
    return isRace
      ? { code: 'STORM', severity: 'warn', suggestion: 'keep', details: { weatherCode: storm.weatherCode } }
      : { code: 'STORM', severity: 'swap', suggestion: 'indoor', details: { weatherCode: storm.weatherCode } };
  }

  const maxRainProbability = Math.max(...windowHours.map((hour) => hour.precipProbabilityPct));
  const totalRainMm = Math.round(windowHours.reduce((sum, hour) => sum + hour.precipMm, 0) * 10) / 10;
  if (maxRainProbability >= WEATHER_RULES.rainProbabilityPct || totalRainMm >= WEATHER_RULES.rainMm) {
    const details = { precipProbabilityPct: maxRainProbability, precipMm: totalRainMm };
    if (isRace) return { code: 'RAIN', severity: 'warn', suggestion: 'keep', details };
    if (isRunningType(params.type)) return { code: 'RAIN', severity: 'swap', suggestion: 'swap', details };
    return { code: 'RAIN', severity: 'info', suggestion: 'keep', details };
  }

  const pmRows = params.pm25.filter(
    (row) =>
      row.time.startsWith(params.date) &&
      hourOf(row.time) >= params.windowStartHour &&
      hourOf(row.time) < params.windowEndHour,
  );
  if (pmRows.length > 0) {
    const maxPm25 = Math.max(...pmRows.map((row) => row.pm25));
    if (maxPm25 > WEATHER_RULES.pm25) {
      if (isRace) return { code: 'AIR', severity: 'warn', suggestion: 'keep', details: { pm25: maxPm25 } };
      return { code: 'AIR', severity: 'swap', suggestion: 'indoor', details: { pm25: maxPm25 } };
    }
  }

  const maxApparent = Math.max(...windowHours.map((hour) => hour.apparentC));
  if (maxApparent >= WEATHER_RULES.heatApparentC) {
    return { code: 'HEAT', severity: 'warn', suggestion: 'earlier', details: { apparentC: maxApparent } };
  }

  const minApparent = Math.min(...windowHours.map((hour) => hour.apparentC));
  if (minApparent <= WEATHER_RULES.coldApparentC) {
    if (isRace) return { code: 'COLD', severity: 'warn', suggestion: 'keep', details: { apparentC: minApparent } };
    return { code: 'COLD', severity: 'swap', suggestion: 'indoor', details: { apparentC: minApparent } };
  }

  const maxGust = Math.max(...windowHours.map((hour) => hour.windGustKmh));
  if (maxGust >= WEATHER_RULES.windKmh) {
    return { code: 'WIND', severity: 'info', suggestion: 'keep', details: { windGustKmh: maxGust } };
  }

  return { code: null, severity: 'none', suggestion: 'keep', details: {} };
}

function startOfWeek(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  const weekday = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - weekday * MS_PER_DAY).toISOString().slice(0, 10);
}

export function pickSwapCandidate(
  target: { id: string; date: string; type: WorkoutType; status: WorkoutStatus },
  weekWorkouts: { id: string; date: string; type: WorkoutType; status: WorkoutStatus }[],
  weekStart?: string,
): SwapCandidate | null {
  if (target.status !== 'PLANNED' || target.type === 'RACE') return null;
  const targetWeek = weekStart ?? startOfWeek(target.date);
  const eligible = weekWorkouts.filter(
    (workout) =>
      workout.id !== target.id &&
      workout.status === 'PLANNED' &&
      workout.type !== 'RACE' &&
      workout.date >= target.date &&
      (weekStart !== undefined
        ? workout.date >= weekStart && workout.date <= addDaysIso(weekStart, 6)
        : startOfWeek(workout.date) === targetWeek),
  );
  const easy = eligible.filter((workout) => workout.type === 'EASY');
  const pool = easy.length > 0 ? easy : eligible.filter((workout) => workout.type === 'REST');
  if (pool.length === 0) return null;

  const distance = (date: string): number =>
    Math.abs(new Date(`${date}T00:00:00.000Z`).getTime() - new Date(`${target.date}T00:00:00.000Z`).getTime());
  const sorted = [...pool].sort((a, b) => distance(a.date) - distance(b.date) || a.date.localeCompare(b.date));
  const best = sorted[0];
  return { id: best.id, date: best.date, type: best.type };
}

function addDaysIso(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
}
