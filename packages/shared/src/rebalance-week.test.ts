import { describe, expect, it } from 'vitest';
import { planWeekAdjustments, type RebalanceWorkout } from './rebalance-week';
import type { WorkoutStatus, WorkoutType } from './types';

const RACE_DATE = '2026-03-01';

function workout(id: string, date: string, type: WorkoutType, status: WorkoutStatus = 'PLANNED'): RebalanceWorkout {
  return { id, date, type, status };
}

describe('planWeekAdjustments', () => {
  it('skips only missed planned run and strength workouts', () => {
    const result = planWeekAdjustments({
      today: '2026-01-07',
      longRunDay: 6,
      raceDate: RACE_DATE,
      workouts: [
        workout('missed-easy', '2026-01-05', 'EASY'),
        workout('done-easy', '2026-01-05', 'EASY', 'DONE'),
        workout('missed-rest', '2026-01-06', 'REST'),
        workout('missed-strength', '2026-01-06', 'STRENGTH'),
        workout('active-easy', '2026-01-07', 'EASY'),
        workout('long', '2026-01-11', 'LONG'),
      ],
    });

    expect(result.skips).toEqual(['missed-easy', 'missed-strength']);
    expect(result.moves).toEqual([]);
  });

  it('keeps the long run weekday and untouched slots when there is no conflict', () => {
    const result = planWeekAdjustments({
      today: '2026-01-07',
      longRunDay: 6,
      raceDate: RACE_DATE,
      workouts: [
        workout('easy', '2026-01-07', 'EASY'),
        workout('tempo', '2026-01-09', 'TEMPO'),
        workout('long', '2026-01-11', 'LONG'),
      ],
    });

    expect(result.skips).toEqual([]);
    expect(result.moves).toEqual([]);
  });

  it('moves a quality session away from the long run', () => {
    const result = planWeekAdjustments({
      today: '2026-01-08',
      longRunDay: 6,
      raceDate: RACE_DATE,
      workouts: [
        workout('easy', '2026-01-08', 'EASY'),
        workout('tempo', '2026-01-10', 'TEMPO'),
        workout('long', '2026-01-11', 'LONG'),
      ],
    });

    expect(result.moves).toEqual([{ id: 'tempo', newDate: '2026-01-09' }]);
  });

  it('keeps a quality session at least one day away from another quality session', () => {
    const result = planWeekAdjustments({
      today: '2026-01-05',
      longRunDay: 6,
      raceDate: RACE_DATE,
      workouts: [
        workout('tempo', '2026-01-07', 'TEMPO'),
        workout('intervals', '2026-01-08', 'INTERVALS'),
        workout('long', '2026-01-11', 'LONG'),
      ],
    });

    expect(result.moves).toEqual([{ id: 'intervals', newDate: '2026-01-09' }]);
  });

  it('skips missed days without backfilling the remaining workouts', () => {
    const result = planWeekAdjustments({
      today: '2026-01-07',
      longRunDay: 6,
      raceDate: RACE_DATE,
      workouts: [
        workout('missed-mon', '2026-01-05', 'EASY'),
        workout('missed-tue', '2026-01-06', 'TEMPO'),
        workout('wed', '2026-01-07', 'EASY'),
        workout('thu', '2026-01-08', 'REST'),
        workout('fri', '2026-01-09', 'TEMPO'),
        workout('sat', '2026-01-10', 'STRENGTH'),
        workout('sun', '2026-01-11', 'LONG'),
      ],
    });

    expect(result.skips).toEqual(['missed-mon', 'missed-tue']);
    expect(result.moves).toEqual([]);
  });

  it('places the long run on the nearest free day when its weekday already passed', () => {
    const result = planWeekAdjustments({
      today: '2026-01-10',
      longRunDay: 2,
      raceDate: RACE_DATE,
      workouts: [workout('easy', '2026-01-10', 'EASY'), workout('long', '2026-01-11', 'LONG')],
    });

    expect(result.moves).toEqual([
      { id: 'easy', newDate: '2026-01-11' },
      { id: 'long', newDate: '2026-01-10' },
    ]);
  });

  it('keeps every move inside today, the current week and the race date', () => {
    const result = planWeekAdjustments({
      today: '2026-01-08',
      longRunDay: 5,
      raceDate: '2026-01-10',
      workouts: [workout('tempo', '2026-01-08', 'TEMPO'), workout('long', '2026-01-09', 'LONG')],
    });

    expect(result.moves).toEqual([{ id: 'long', newDate: '2026-01-10' }]);
    for (const move of result.moves) {
      expect(move.newDate >= '2026-01-08').toBe(true);
      expect(move.newDate <= '2026-01-10').toBe(true);
      expect(move.newDate <= '2026-01-11').toBe(true);
    }
  });

  it('leaves workouts outside the current week untouched', () => {
    const result = planWeekAdjustments({
      today: '2026-01-07',
      longRunDay: 6,
      raceDate: RACE_DATE,
      workouts: [
        workout('easy', '2026-01-07', 'EASY'),
        workout('long', '2026-01-11', 'LONG'),
        workout('next-week', '2026-01-14', 'TEMPO'),
      ],
    });

    expect(result.skips).toEqual([]);
    expect(result.moves).toEqual([]);
  });

  it('is deterministic for identical input', () => {
    const params = {
      today: '2026-01-05',
      longRunDay: 6,
      raceDate: RACE_DATE,
      workouts: [
        workout('tempo', '2026-01-07', 'TEMPO'),
        workout('intervals', '2026-01-08', 'INTERVALS'),
        workout('long', '2026-01-11', 'LONG'),
      ],
    };

    expect(planWeekAdjustments(params)).toEqual(planWeekAdjustments(params));
  });
});
