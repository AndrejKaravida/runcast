import { describe, expect, it } from 'vitest';
import { addDays, weekdayOf } from './dates';
import { buildRecoveryPlan, defaultRecoveryRunDays } from './recovery-plan';

const START_DATE = '2026-01-07';

describe('buildRecoveryPlan', () => {
  it('builds two weeks of easy runs and mobility only', () => {
    const workouts = buildRecoveryPlan({ startDate: START_DATE, runDays: [1, 3, 5] });

    expect(workouts).toHaveLength(8);
    expect(workouts.filter((workout) => workout.type === 'EASY')).toHaveLength(6);
    expect(workouts.filter((workout) => workout.type === 'STRENGTH')).toHaveLength(2);
    expect(new Set(workouts.map((workout) => workout.date)).size).toBe(workouts.length);
    for (const workout of workouts) {
      expect(workout.phase).toBe('BASE');
      expect(workout.date >= START_DATE).toBe(true);
      expect(workout.date <= addDays(START_DATE, 13)).toBe(true);
      if (workout.type === 'EASY') {
        expect(workout.paceZone).toBe('E');
        expect(workout.steps).toHaveLength(1);
        expect(workout.steps[0].durationSec).toBe(workout.durationSec);
      }
    }
  });

  it('progresses easy runs from thirty to fifty minutes and never schedules quality or long runs', () => {
    const workouts = buildRecoveryPlan({ startDate: START_DATE, runDays: [1, 3, 5] });

    for (const workout of workouts) {
      expect(['EASY', 'STRENGTH']).toContain(workout.type);
      expect(workout.paceZone === null || workout.paceZone === 'E').toBe(true);
    }
    const week = (index: number) => workouts.filter((workout) => workout.weekIndex === index);
    const minutes = (index: number) =>
      week(index)
        .filter((workout) => workout.type === 'EASY')
        .map((workout) => (workout.durationSec as number) / 60);
    expect(minutes(1)).toEqual([30, 35, 40]);
    expect(minutes(2)).toEqual([40, 45, 50]);
  });

  it('reuses the strength mobility draft shape for one session per week', () => {
    const workouts = buildRecoveryPlan({ startDate: START_DATE, runDays: [1, 3, 5] });
    const mobility = workouts.filter((workout) => workout.type === 'STRENGTH');

    expect(mobility).toHaveLength(2);
    for (const workout of mobility) {
      expect(workout.title).toBe('Mobilnost 20 min');
      expect(workout.paceZone).toBeNull();
      expect(workout.distanceKm).toBe(0);
      expect(workout.durationSec).toBe(1200);
      expect(workout.steps).toHaveLength(6);
      expect(workout.steps.reduce((sum, step) => sum + (step.durationSec ?? 0), 0)).toBe(workout.durationSec);
    }
  });

  it('places runs on the requested weekdays for shorter run weeks', () => {
    const workouts = buildRecoveryPlan({ startDate: START_DATE, runDays: [1, 4] });
    const runs = workouts.filter((workout) => workout.type === 'EASY');

    expect(runs).toHaveLength(4);
    for (const run of runs) expect([1, 4]).toContain(weekdayOf(run.date));
  });

  it('rejects invalid run day lists', () => {
    expect(() => buildRecoveryPlan({ startDate: START_DATE, runDays: [1] })).toThrow();
    expect(() => buildRecoveryPlan({ startDate: START_DATE, runDays: [1, 1, 3] })).toThrow();
    expect(() => buildRecoveryPlan({ startDate: START_DATE, runDays: [7, 3] })).toThrow();
  });

  it('is deterministic for identical input', () => {
    const params = { startDate: START_DATE, runDays: [1, 3, 5] };
    expect(buildRecoveryPlan(params)).toEqual(buildRecoveryPlan(params));
  });
});

describe('defaultRecoveryRunDays', () => {
  it('spreads three run days for frequent runners and two for the rest', () => {
    expect(defaultRecoveryRunDays(3)).toEqual([1, 4]);
    expect(defaultRecoveryRunDays(4)).toEqual([1, 3, 5]);
    expect(defaultRecoveryRunDays(6)).toEqual([1, 3, 5]);
  });
});
