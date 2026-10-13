import { describe, expect, it } from 'vitest';
import { planRealignment, recentMissedCount } from './plan-realignment';
import { planWeekAdjustments, type RebalanceWorkout } from './rebalance-week';
import type { WorkoutStatus, WorkoutType } from './types';

function workout(id: string, date: string, type: WorkoutType, status: WorkoutStatus = 'PLANNED'): RebalanceWorkout {
  return { id, date, type, status };
}

describe('planRealignment', () => {
  it('skips every planned run workout before today, not only the current week', () => {
    const result = planRealignment({
      today: '2026-01-12',
      longRunDay: 6,
      raceDate: '2026-02-01',
      workouts: [
        workout('old-easy', '2026-01-05', 'EASY'),
        workout('done-easy', '2026-01-06', 'EASY', 'DONE'),
        workout('missed-quality', '2026-01-10', 'TEMPO'),
        workout('missed-rest', '2026-01-11', 'REST'),
        workout('future-easy', '2026-01-12', 'EASY'),
      ],
    });

    expect(result.skips).toEqual(['old-easy', 'missed-quality']);
    expect(result.moves).toEqual([]);
  });

  it('aggregates the same placement as planWeekAdjustments for each week to the race date', () => {
    const workouts = [
      workout('easy-1', '2026-01-05', 'EASY'),
      workout('tempo-1', '2026-01-10', 'TEMPO'),
      workout('long-1', '2026-01-11', 'LONG'),
      workout('easy-2', '2026-01-12', 'EASY'),
      workout('intervals-2', '2026-01-17', 'INTERVALS'),
      workout('long-2', '2026-01-18', 'LONG'),
      workout('easy-3', '2026-01-19', 'EASY'),
      workout('long-3', '2026-01-25', 'LONG'),
    ];

    const full = planRealignment({ workouts, today: '2026-01-05', longRunDay: 6, raceDate: '2026-01-25' });
    const firstWeek = planWeekAdjustments({ workouts, today: '2026-01-05', longRunDay: 6, raceDate: '2026-01-25' });
    const secondWeek = planWeekAdjustments({ workouts, today: '2026-01-12', longRunDay: 6, raceDate: '2026-01-25' });
    const thirdWeek = planWeekAdjustments({ workouts, today: '2026-01-19', longRunDay: 6, raceDate: '2026-01-25' });

    expect(full.moves).toEqual([...firstWeek.moves, ...secondWeek.moves, ...thirdWeek.moves]);
    expect(full.moves).toEqual([
      { id: 'tempo-1', newDate: '2026-01-06' },
      { id: 'intervals-2', newDate: '2026-01-13' },
    ]);
  });

  it('keeps every move inside its own week and before the race date', () => {
    const result = planRealignment({
      today: '2026-01-05',
      longRunDay: 6,
      raceDate: '2026-01-21',
      workouts: [
        workout('easy-1', '2026-01-05', 'EASY'),
        workout('tempo-1', '2026-01-07', 'TEMPO'),
        workout('easy-2', '2026-01-19', 'EASY'),
        workout('tempo-2', '2026-01-20', 'TEMPO'),
        workout('race', '2026-01-21', 'RACE'),
      ],
    });

    for (const move of result.moves) {
      expect(move.newDate <= '2026-01-21').toBe(true);
      expect(move.newDate > '2026-01-18').toBe(true);
    }
  });

  it('returns skips without moves when the race date already passed', () => {
    const result = planRealignment({
      today: '2026-01-20',
      longRunDay: 6,
      raceDate: '2026-01-15',
      workouts: [workout('missed', '2026-01-18', 'EASY'), workout('easy', '2026-01-20', 'EASY')],
    });

    expect(result.skips).toEqual(['missed']);
    expect(result.moves).toEqual([]);
  });

  it('is deterministic for identical input', () => {
    const params = {
      today: '2026-01-05',
      longRunDay: 6,
      raceDate: '2026-01-25',
      workouts: [
        workout('easy-1', '2026-01-05', 'EASY'),
        workout('tempo-1', '2026-01-10', 'TEMPO'),
        workout('long-1', '2026-01-11', 'LONG'),
        workout('easy-2', '2026-01-12', 'EASY'),
        workout('intervals-2', '2026-01-17', 'INTERVALS'),
        workout('long-2', '2026-01-18', 'LONG'),
      ],
    };

    expect(planRealignment(params)).toEqual(planRealignment(params));
  });
});

describe('recentMissedCount', () => {
  it('counts only planned non-rest workouts inside the recent window', () => {
    const workouts = [
      workout('yesterday', '2026-01-19', 'EASY'),
      workout('edge', '2026-01-06', 'TEMPO'),
      workout('too-old', '2026-01-05', 'EASY'),
      workout('done', '2026-01-18', 'EASY', 'DONE'),
      workout('rest', '2026-01-15', 'REST'),
      workout('today', '2026-01-20', 'EASY'),
    ];

    expect(recentMissedCount(workouts, '2026-01-20')).toBe(2);
    expect(recentMissedCount(workouts, '2026-01-20', 7)).toBe(1);
  });
});
