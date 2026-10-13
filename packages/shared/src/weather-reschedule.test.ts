import { describe, expect, it } from 'vitest';
import { scoreWindow, suggestReschedule, type RescheduleWorkout } from './weather-reschedule';
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

function dayHours(date: string, hours: number[], overrides: Partial<HourlyForecast> = {}): HourlyForecast[] {
  return hours.map((value) => hour(`${date}T${String(value).padStart(2, '0')}:00`, overrides));
}

const MORNING = { startHour: 6, endHour: 9 };
const today = '2026-01-05';
const rain = { precipProbabilityPct: 90, precipMm: 3 };

function suggestionFor(overrides: {
  workout?: { id: string; type: WorkoutType; status: WorkoutStatus };
  weekWorkouts: RescheduleWorkout[];
  hours: HourlyForecast[];
  runWindow?: 'morning' | 'evening' | 'flexible';
  today?: string;
}) {
  return suggestReschedule({
    workout: overrides.workout ?? { id: 't', type: 'LONG', status: 'PLANNED' },
    weekWorkouts: overrides.weekWorkouts,
    hours: overrides.hours,
    pm25: [],
    runWindow: overrides.runWindow ?? 'morning',
    today: overrides.today ?? today,
  });
}

describe('scoreWindow', () => {
  it('scores clear weather perfectly', () => {
    expect(scoreWindow(dayHours(today, [6, 7, 8]), [], MORNING, today)).toEqual({
      score: 100,
      precipPct: 0,
      precipMm: 0,
      apparentC: 15,
      windGust: 10,
      pm25: 0,
    });
  });

  it('scores missing hours as zero with zeroed metrics', () => {
    expect(scoreWindow(dayHours(today, [12, 13]), [], MORNING, today)).toEqual({
      score: 0,
      precipPct: 0,
      precipMm: 0,
      apparentC: 0,
      windGust: 0,
      pm25: 0,
    });
  });

  it('disqualifies storm hours', () => {
    expect(scoreWindow(dayHours(today, [6, 7, 8], { weatherCode: 96 }), [], MORNING, today).score).toBe(0);
  });

  it('punishes heavy rain hardest', () => {
    const scored = scoreWindow(dayHours(today, [6, 7, 8], rain), [], MORNING, today);
    expect(scored).toMatchObject({ score: 11, precipPct: 90, precipMm: 9 });
  });

  it('drops to the prompt threshold at rule-level rain', () => {
    const scored = scoreWindow(
      dayHours(today, [6, 7, 8], { precipProbabilityPct: 60, precipMm: 0.7 }),
      [],
      MORNING,
      today,
    );
    expect(scored.precipMm).toBe(2.1);
    expect(scored.score).toBe(47);
  });

  it('keeps light rain above the prompt threshold', () => {
    const scored = scoreWindow(
      dayHours(today, [6, 7, 8], { precipProbabilityPct: 25, precipMm: 0.3 }),
      [],
      MORNING,
      today,
    );
    expect(scored.score).toBe(78);
  });

  it('applies moderate heat, cold, wind and air penalties', () => {
    expect(scoreWindow(dayHours(today, [6, 7, 8], { apparentC: 33 }), [], MORNING, today).score).toBe(70);
    expect(scoreWindow(dayHours(today, [6, 7, 8], { apparentC: -8 }), [], MORNING, today).score).toBe(70);
    expect(scoreWindow(dayHours(today, [6, 7, 8], { windGustKmh: 45 }), [], MORNING, today).score).toBe(80);
    expect(scoreWindow(dayHours(today, [6, 7, 8]), [{ time: `${today}T07:00`, pm25: 60 }], MORNING, today).score).toBe(
      75,
    );
  });

  it('clamps the score at zero', () => {
    const scored = scoreWindow(
      dayHours(today, [6, 7, 8], { precipProbabilityPct: 100, precipMm: 10, apparentC: 33, windGustKmh: 60 }),
      [{ time: `${today}T07:00`, pm25: 100 }],
      MORNING,
      today,
    );
    expect(scored.score).toBe(0);
  });
});

describe('suggestReschedule', () => {
  const week: RescheduleWorkout[] = [
    { id: 't', date: today, type: 'LONG', status: 'PLANNED' },
    { id: 'r0', date: '2026-01-06', type: 'REST', status: 'PLANNED' },
    { id: 'e1', date: '2026-01-07', type: 'EASY', status: 'PLANNED' },
    { id: 'e2', date: '2026-01-09', type: 'EASY', status: 'PLANNED' },
    { id: 'e3', date: '2026-01-11', type: 'EASY', status: 'PLANNED' },
  ];
  const ranksHours = [
    ...dayHours(today, [6, 7, 8], rain),
    ...dayHours('2026-01-07', [6, 7, 8], { precipProbabilityPct: 10 }),
    ...dayHours('2026-01-09', [6, 7, 8], { precipProbabilityPct: 50 }),
    ...dayHours('2026-01-11', [6, 7, 8], { precipProbabilityPct: 70 }),
  ];

  it('ranks swap options by score, best first', () => {
    const suggestion = suggestionFor({ weekWorkouts: week, hours: ranksHours });
    expect(suggestion.todayScore).toBe(11);
    expect(suggestion.options.map((option) => option.kind)).toEqual(['swap', 'swap', 'swap']);
    expect(suggestion.options.map((option) => (option.kind === 'swap' ? option.date : ''))).toEqual([
      '2026-01-07',
      '2026-01-09',
      '2026-01-11',
    ]);
    expect(suggestion.options[0]).toMatchObject({
      kind: 'swap',
      workoutId: 'e1',
      score: 94,
      text: { key: 'content:reschedule.reason', params: { pct: 10, temp: 15 } },
    });
  });

  it('adds the indoor fallback only when no swap scores well', () => {
    const rainyHours = [
      ...dayHours(today, [6, 7, 8], rain),
      ...dayHours('2026-01-06', [6, 7, 8], rain),
      ...dayHours('2026-01-07', [6, 7, 8], rain),
      ...dayHours('2026-01-09', [6, 7, 8], rain),
      ...dayHours('2026-01-11', [6, 7, 8], rain),
    ];
    const suggestion = suggestionFor({ weekWorkouts: week, hours: rainyHours });
    expect(suggestion.options.map((option) => option.kind)).toEqual(['swap', 'swap', 'indoor']);
  });

  it('falls back to rest days when there is no easy day', () => {
    const restWeek: RescheduleWorkout[] = [
      { id: 't', date: today, type: 'EASY', status: 'PLANNED' },
      { id: 'r1', date: '2026-01-07', type: 'REST', status: 'PLANNED' },
    ];
    const hours = [...dayHours(today, [6, 7, 8], rain), ...dayHours('2026-01-07', [6, 7, 8])];
    const suggestion = suggestionFor({
      workout: { id: 't', type: 'EASY', status: 'PLANNED' },
      weekWorkouts: restWeek,
      hours,
    });
    expect(suggestion.options[0]).toMatchObject({ kind: 'swap', workoutId: 'r1', score: 100 });
  });

  it('skips candidate days that would create quality adjacency', () => {
    const spacingWeek: RescheduleWorkout[] = [
      { id: 't', date: today, type: 'LONG', status: 'PLANNED' },
      { id: 'q', date: '2026-01-08', type: 'TEMPO', status: 'PLANNED' },
      { id: 'e1', date: '2026-01-07', type: 'EASY', status: 'PLANNED' },
      { id: 'e2', date: '2026-01-09', type: 'EASY', status: 'PLANNED' },
    ];
    const hours = [
      ...dayHours(today, [6, 7, 8], rain),
      ...dayHours('2026-01-07', [6, 7, 8]),
      ...dayHours('2026-01-09', [6, 7, 8]),
    ];
    const suggestion = suggestionFor({ weekWorkouts: spacingWeek, hours });
    expect(suggestion.options.some((option) => option.kind === 'swap')).toBe(false);
    expect(suggestion.options.some((option) => option.kind === 'indoor')).toBe(true);
  });

  it('never suggests past, done, skipped, race or other-week days', () => {
    const sparseWeek: RescheduleWorkout[] = [
      { id: 't', date: today, type: 'EASY', status: 'PLANNED' },
      { id: 'past', date: '2026-01-04', type: 'EASY', status: 'PLANNED' },
      { id: 'done', date: '2026-01-06', type: 'EASY', status: 'DONE' },
      { id: 'skipped', date: '2026-01-07', type: 'EASY', status: 'SKIPPED' },
      { id: 'race', date: '2026-01-08', type: 'RACE', status: 'PLANNED' },
      { id: 'next', date: '2026-01-12', type: 'EASY', status: 'PLANNED' },
    ];
    const suggestion = suggestionFor({
      workout: { id: 't', type: 'EASY', status: 'PLANNED' },
      weekWorkouts: sparseWeek,
      hours: dayHours(today, [6, 7, 8], rain),
    });
    expect(suggestion.options.some((option) => option.kind === 'swap')).toBe(false);
  });

  it('returns no options for done, race, rest or strength targets', () => {
    const cases: [WorkoutType, WorkoutStatus][] = [
      ['LONG', 'DONE'],
      ['RACE', 'PLANNED'],
      ['REST', 'PLANNED'],
      ['STRENGTH', 'PLANNED'],
    ];
    for (const [type, status] of cases) {
      const suggestion = suggestionFor({
        workout: { id: 't', type, status },
        weekWorkouts: week,
        hours: ranksHours,
      });
      expect(suggestion.options).toEqual([]);
    }
  });

  it('returns no options when today has no forecast hours', () => {
    const suggestion = suggestionFor({
      weekWorkouts: week,
      hours: dayHours('2026-01-04', [6, 7, 8], rain),
    });
    expect(suggestion.options).toEqual([]);
  });

  it('returns at most three swap options', () => {
    const dates = ['2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10', '2026-01-11'];
    const manyWeek: RescheduleWorkout[] = [
      { id: 't', date: today, type: 'EASY', status: 'PLANNED' },
      ...dates.map((date, index) => ({ id: `e${index}`, date, type: 'EASY' as const, status: 'PLANNED' as const })),
    ];
    const hours = [...dayHours(today, [6, 7, 8], rain), ...dates.flatMap((date) => dayHours(date, [6, 7, 8]))];
    const suggestion = suggestionFor({
      workout: { id: 't', type: 'EASY', status: 'PLANNED' },
      weekWorkouts: manyWeek,
      hours,
    });
    expect(suggestion.options.length).toBe(3);
    expect(suggestion.options.every((option) => option.kind === 'swap')).toBe(true);
  });

  it('offers a window shift when the other window is clearly better', () => {
    const hours = [...dayHours(today, [6, 7, 8], rain), ...dayHours(today, [17, 18, 19, 20])];
    const suggestion = suggestionFor({
      weekWorkouts: [{ id: 't', date: today, type: 'LONG', status: 'PLANNED' }],
      hours,
    });
    expect(suggestion.options[0]).toMatchObject({ kind: 'shift', window: 'evening', score: 100 });
    expect(suggestion.options.some((option) => option.kind === 'indoor')).toBe(true);
  });

  it('does not suggest a shift when both windows score the same', () => {
    const hours = [...dayHours(today, [6, 7, 8], rain), ...dayHours(today, [17, 18, 19, 20], rain)];
    const suggestion = suggestionFor({
      weekWorkouts: [{ id: 't', date: today, type: 'LONG', status: 'PLANNED' }],
      hours,
    });
    expect(suggestion.options.some((option) => option.kind === 'shift')).toBe(false);
  });

  it('keeps the swap ranking ahead of a weaker shift', () => {
    const hours = [
      ...dayHours(today, [6, 7, 8], rain),
      ...dayHours(today, [17, 18, 19, 20], { precipProbabilityPct: 60, precipMm: 1 }),
      ...dayHours('2026-01-07', [6, 7, 8]),
    ];
    const suggestion = suggestionFor({
      weekWorkouts: [
        { id: 't', date: today, type: 'LONG', status: 'PLANNED' },
        { id: 'e1', date: '2026-01-07', type: 'EASY', status: 'PLANNED' },
      ],
      hours,
    });
    expect(suggestion.options.some((option) => option.kind === 'shift')).toBe(false);
    expect(suggestion.options[0]).toMatchObject({ kind: 'swap', workoutId: 'e1' });
  });

  it('exposes every text as a content:reschedule key', () => {
    const rainyHours = [
      ...dayHours(today, [6, 7, 8], rain),
      ...dayHours(today, [17, 18, 19, 20], rain),
      ...dayHours('2026-01-06', [6, 7, 8], rain),
      ...dayHours('2026-01-07', [6, 7, 8], rain),
      ...dayHours('2026-01-09', [6, 7, 8], rain),
      ...dayHours('2026-01-11', [6, 7, 8], rain),
    ];
    const suggestion = suggestionFor({ weekWorkouts: week, hours: rainyHours });
    const keys = suggestion.options.map((option) => option.text.key);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((key) => key.startsWith('content:reschedule.'))).toBe(true);
  });
});
