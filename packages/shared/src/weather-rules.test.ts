import { describe, expect, it } from 'vitest';
import { assessWorkoutWeather, pickSwapCandidate, runWindowHours, WEATHER_RULES } from './weather-rules';
import type { HourlyForecast } from './weather';
import type { WorkoutStatus, WorkoutType } from './types';

function hour(time: string, overrides: Partial<HourlyForecast> = {}): HourlyForecast {
  return {
    time,
    temperatureC: 15,
    apparentC: 15,
    precipProbabilityPct: 0,
    precipMm: 0,
    weatherCode: 1,
    windKmh: 5,
    windGustKmh: 10,
    ...overrides,
  };
}

function assess(type: WorkoutType, hours: HourlyForecast[], pm25: { time: string; pm25: number }[] = []) {
  return assessWorkoutWeather({
    type,
    hours,
    pm25,
    windowStartHour: 6,
    windowEndHour: 9,
    date: '2026-01-05',
  });
}

describe('runWindowHours', () => {
  it('maps windows to hour ranges', () => {
    expect(runWindowHours('morning')).toEqual({ startHour: 6, endHour: 9 });
    expect(runWindowHours('evening')).toEqual({ startHour: 17, endHour: 21 });
    expect(runWindowHours('flexible')).toEqual({ startHour: 6, endHour: 21 });
  });
});

describe('assessWorkoutWeather', () => {
  it('returns info when there are no hours in the window', () => {
    expect(assess('EASY', [])).toEqual({
      code: null,
      severity: 'info',
      suggestion: 'keep',
      details: { info: 'no-hours' },
    });
    expect(assess('EASY', [hour('2026-01-05T12:00', { weatherCode: 96 })]).code).toBeNull();
  });

  it('never suggests changes on rest days', () => {
    expect(assess('REST', [hour('2026-01-05T07:00', { weatherCode: 96 })])).toEqual({
      code: null,
      severity: 'info',
      suggestion: 'keep',
      details: { info: 'rest-day' },
    });
  });

  it('flags storms: swap for training, keep for races', () => {
    const stormy = [hour('2026-01-05T07:00', { weatherCode: 96 })];
    expect(assess('EASY', stormy)).toMatchObject({ code: 'STORM', severity: 'swap', suggestion: 'indoor' });
    expect(assess('RACE', stormy)).toMatchObject({ code: 'STORM', severity: 'warn', suggestion: 'keep' });
  });

  it('treats 95/96/99 as storms and 94 as not', () => {
    for (const code of [95, 96, 99]) {
      expect(assess('EASY', [hour('2026-01-05T07:00', { weatherCode: code })]).code).toBe('STORM');
    }
    expect(assess('EASY', [hour('2026-01-05T07:00', { weatherCode: 94 })]).code).toBeNull();
  });

  it('flags rain by probability or millimeters', () => {
    const rainy = [hour('2026-01-05T07:00', { precipProbabilityPct: 80 })];
    expect(assess('EASY', rainy)).toMatchObject({ code: 'RAIN', severity: 'swap', suggestion: 'swap' });
    const wet = [hour('2026-01-05T07:00', { precipMm: 1 }), hour('2026-01-05T08:00', { precipMm: 1.5 })];
    expect(assess('TEMPO', wet)).toMatchObject({ code: 'RAIN', severity: 'swap' });
    expect(assess('RACE', rainy)).toMatchObject({ code: 'RAIN', severity: 'warn', suggestion: 'keep' });
  });

  it('ignores light rain', () => {
    expect(assess('EASY', [hour('2026-01-05T07:00', { precipProbabilityPct: 10, precipMm: 1 })])).toEqual({
      code: null,
      severity: 'none',
      suggestion: 'keep',
      details: {},
    });
  });

  it('flags bad air quality before heat', () => {
    const result = assess(
      'EASY',
      [hour('2026-01-05T07:00', { apparentC: 33 })],
      [{ time: '2026-01-05T07:00', pm25: 60 }],
    );
    expect(result).toMatchObject({ code: 'AIR', severity: 'swap', suggestion: 'indoor' });
  });

  it('keeps bad air quality informational on race day', () => {
    const result = assess('RACE', [hour('2026-01-05T07:00')], [{ time: '2026-01-05T07:00', pm25: 60 }]);
    expect(result).toMatchObject({ code: 'AIR', severity: 'warn', suggestion: 'keep' });
  });

  it('flags heat, cold and wind', () => {
    expect(assess('EASY', [hour('2026-01-05T07:00', { apparentC: 33 })])).toMatchObject({
      code: 'HEAT',
      severity: 'warn',
      suggestion: 'earlier',
    });
    expect(assess('EASY', [hour('2026-01-05T07:00', { apparentC: -8 })])).toMatchObject({
      code: 'COLD',
      severity: 'swap',
      suggestion: 'indoor',
    });
    expect(assess('RACE', [hour('2026-01-05T07:00', { apparentC: -8 })])).toMatchObject({
      code: 'COLD',
      severity: 'warn',
      suggestion: 'keep',
    });
    expect(assess('EASY', [hour('2026-01-05T07:00', { windGustKmh: 45 })])).toMatchObject({
      code: 'WIND',
      severity: 'info',
      suggestion: 'keep',
    });
  });

  it('applies inclusive thresholds', () => {
    expect(assess('EASY', [hour('2026-01-05T07:00', { precipProbabilityPct: 60 })]).code).toBe('RAIN');
    expect(assess('EASY', [hour('2026-01-05T07:00', { windGustKmh: 40 })]).code).toBe('WIND');
    expect(assess('EASY', [hour('2026-01-05T07:00')], [{ time: '2026-01-05T07:00', pm25: 55 }]).code).toBeNull();
  });

  it('exposes the rule thresholds', () => {
    expect(WEATHER_RULES.rainProbabilityPct).toBe(60);
    expect(WEATHER_RULES.pm25).toBe(55);
  });
});

describe('pickSwapCandidate', () => {
  const week = [
    { id: 'a', date: '2026-01-05', type: 'EASY' as WorkoutType, status: 'PLANNED' as WorkoutStatus },
    { id: 'b', date: '2026-01-07', type: 'EASY' as WorkoutType, status: 'PLANNED' as WorkoutStatus },
    { id: 'c', date: '2026-01-08', type: 'TEMPO' as WorkoutType, status: 'PLANNED' as WorkoutStatus },
    { id: 'd', date: '2026-01-11', type: 'LONG' as WorkoutType, status: 'PLANNED' as WorkoutStatus },
    { id: 'e', date: '2026-01-09', type: 'REST' as WorkoutType, status: 'PLANNED' as WorkoutStatus },
    { id: 'f', date: '2026-01-06', type: 'EASY' as WorkoutType, status: 'DONE' as WorkoutStatus },
  ];

  it('prefers the nearest future easy day in the same week', () => {
    const candidate = pickSwapCandidate({ id: 'c', date: '2026-01-08', type: 'TEMPO', status: 'PLANNED' }, week);
    expect(candidate).toEqual({ id: 'e', date: '2026-01-09', type: 'REST' });
  });

  it('never moves a workout into the past', () => {
    const onlyPastEasy = week.filter((workout) => workout.id !== 'e' && workout.id !== 'd');
    const candidate = pickSwapCandidate(
      { id: 'c', date: '2026-01-08', type: 'TEMPO', status: 'PLANNED' },
      onlyPastEasy,
    );
    expect(candidate).toBeNull();
  });

  it('falls back to rest days when no easy day is available', () => {
    const noEasy = week.filter((workout) => workout.type !== 'EASY');
    const candidate = pickSwapCandidate({ id: 'c', date: '2026-01-08', type: 'TEMPO', status: 'PLANNED' }, noEasy);
    expect(candidate).toEqual({ id: 'e', date: '2026-01-09', type: 'REST' });
  });

  it('refuses done, skipped or race targets', () => {
    expect(pickSwapCandidate({ id: 'c', date: '2026-01-08', type: 'TEMPO', status: 'DONE' }, week)).toBeNull();
    expect(pickSwapCandidate({ id: 'c', date: '2026-01-08', type: 'TEMPO', status: 'SKIPPED' }, week)).toBeNull();
    expect(pickSwapCandidate({ id: 'd', date: '2026-01-11', type: 'RACE', status: 'PLANNED' }, week)).toBeNull();
  });

  it('never picks done, skipped, race or other-week workouts', () => {
    const sparse = [
      { id: 'f', date: '2026-01-06', type: 'EASY' as WorkoutType, status: 'DONE' as WorkoutStatus },
      { id: 'g', date: '2026-01-14', type: 'EASY' as WorkoutType, status: 'PLANNED' as WorkoutStatus },
      { id: 'h', date: '2026-01-03', type: 'RACE' as WorkoutType, status: 'PLANNED' as WorkoutStatus },
    ];
    expect(pickSwapCandidate({ id: 'c', date: '2026-01-08', type: 'TEMPO', status: 'PLANNED' }, sparse)).toBeNull();
  });
});
