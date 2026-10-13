import { describe, expect, it } from 'vitest';
import { addDays, weekdayOf } from './dates';
import { generatePlan } from './plan-generator';
import { strengthDaysFor, strengthWorkoutsForWeek, type StrengthWeekInput } from './strength';
import type { PlanConfig, WorkoutDraft } from './types';

const RUN_TYPES = ['EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'RACE'];

const fullConfig: PlanConfig = {
  raceDate: '2026-05-10',
  startDate: '2026-01-05',
  daysPerWeek: 4,
  longRunDay: 0,
  experience: 'experienced',
  volumeBand: '40-60',
  anchor: { kind: 'goal', distanceKm: 42.195, timeSec: 13500 },
};

const weekInput: StrengthWeekInput = {
  weekStart: '2026-01-05',
  weekIndex: 5,
  phaseWeek: 0,
  phase: 'BUILD',
  daysPerWeek: 4,
  longRunDay: 0,
  runDays: [0, 2, 3, 4],
  experience: 'experienced',
  isRaceWeek: false,
  daysToRace: 125,
};

function workoutsByWeek(workouts: WorkoutDraft[]): Map<number, WorkoutDraft[]> {
  const map = new Map<number, WorkoutDraft[]>();
  for (const workout of workouts) map.set(workout.weekIndex, [...(map.get(workout.weekIndex) ?? []), workout]);
  return map;
}

describe('strengthDaysFor', () => {
  it('returns nothing for race week and for taper inside the final ten days', () => {
    expect(strengthDaysFor({ ...weekInput, isRaceWeek: true })).toEqual([]);
    expect(strengthDaysFor({ ...weekInput, phase: 'TAPER', phaseWeek: 2, daysToRace: 6 })).toEqual([]);
  });

  it('places two sessions on free rest days, skipping the day before the long run', () => {
    expect(strengthDaysFor(weekInput)).toEqual([1, 5]);
    expect(strengthDaysFor({ ...weekInput, phase: 'BASE', phaseWeek: 1 })).toEqual([1, 5]);
  });

  it('keeps taper to a single session when the race is at least ten days away', () => {
    expect(strengthDaysFor({ ...weekInput, phase: 'TAPER', phaseWeek: 0, daysToRace: 20 })).toEqual([1]);
  });

  it('never picks adjacent days while a non-adjacent candidate remains', () => {
    expect(strengthDaysFor({ ...weekInput, runDays: [0, 3], longRunDay: 0 })).toEqual([1, 4]);
  });

  it('returns nothing when all days are runs or the day before the long run', () => {
    expect(strengthDaysFor({ ...weekInput, runDays: [0, 1, 2, 3, 4, 6], longRunDay: 6 })).toEqual([]);
  });
});

describe('strengthWorkoutsForWeek', () => {
  it('builds contract-conform drafts with sets and reps steps', () => {
    const sessions = strengthWorkoutsForWeek(weekInput);
    expect(sessions.map((session) => session.title)).toEqual(['Snaga A — noge i core', 'Snaga B — glute i core']);
    expect(sessions.map((session) => session.date)).toEqual(['2026-01-06', '2026-01-10']);
    for (const session of sessions) {
      expect(session.type).toBe('STRENGTH');
      expect(session.distanceKm).toBe(0);
      expect(session.paceZone).toBeNull();
      expect(session.phase).toBe('BUILD');
      expect(session.weekIndex).toBe(5);
      expect(session.durationSec).toBeGreaterThanOrEqual(1200);
      expect(session.durationSec).toBeLessThanOrEqual(2100);
      expect(session.steps.length).toBeGreaterThan(0);
      for (const step of session.steps) {
        expect(step.label.length).toBeGreaterThan(0);
        expect(step.durationSec).toBeGreaterThan(0);
        expect(step.label).toMatch(/(— \d+×\d+|— \d+ min|— \d+ s)/);
      }
      expect(session.steps.reduce((sum, step) => sum + (step.durationSec ?? 0), 0)).toBe(session.durationSec);
    }
  });

  it('progresses sets, keeps plyo out for first-time runners and uses phase templates', () => {
    const advanced = strengthWorkoutsForWeek({ ...weekInput, phaseWeek: 1, experience: 'experienced' });
    expect(advanced[0].steps.some((step) => step.label.includes('4×8'))).toBe(true);
    expect(advanced[0].steps.some((step) => step.label.includes('Poskoci'))).toBe(true);
    const beginner = strengthWorkoutsForWeek({ ...weekInput, phaseWeek: 1, experience: 'first' });
    expect(beginner[0].steps.some((step) => step.label.includes('3×12'))).toBe(true);
    expect(beginner[0].steps.some((step) => step.label.includes('Poskoci'))).toBe(false);
    const peak = strengthWorkoutsForWeek({ ...weekInput, phase: 'PEAK', daysToRace: 20 });
    expect(peak.map((session) => session.title)).toEqual(['Snaga — održavanje', 'Mobilnost 20 min']);
    const taper = strengthWorkoutsForWeek({ ...weekInput, phase: 'TAPER', phaseWeek: 0, daysToRace: 20 });
    expect(taper).toHaveLength(1);
    expect(taper[0].title).toBe('Mobilnost 20 min');
  });

  it('is deterministic and sorted by date', () => {
    const first = JSON.stringify(strengthWorkoutsForWeek(weekInput));
    const second = JSON.stringify(strengthWorkoutsForWeek(weekInput));
    expect(first).toBe(second);
  });
});

describe('generatePlan strength integration', () => {
  it('keeps strength off run days, off the day before the long run and out of race week for every long run day', () => {
    for (let longRunDay = 0; longRunDay < 7; longRunDay++) {
      const plan = generatePlan({ ...fullConfig, longRunDay });
      const byWeek = workoutsByWeek(plan.workouts);
      const race = plan.workouts.at(-1);
      const raceEve = race ? addDays(race.date, -1) : null;
      for (const week of byWeek.values()) {
        const runDays = week
          .filter((workout) => RUN_TYPES.includes(workout.type))
          .map((workout) => weekdayOf(workout.date));
        for (const session of week.filter((workout) => workout.type === 'STRENGTH')) {
          const day = weekdayOf(session.date);
          expect(runDays).not.toContain(day);
          expect(day).not.toBe((longRunDay + 6) % 7);
          expect(session.date).not.toBe(raceEve);
          expect(session.distanceKm).toBe(0);
          expect(session.paceZone).toBeNull();
          expect(session.durationSec).toBeGreaterThanOrEqual(1200);
          expect(session.durationSec).toBeLessThanOrEqual(2100);
          expect(session.phase).not.toBe('RACE');
          for (const step of session.steps) expect(step.durationSec).toBeGreaterThan(0);
        }
      }
      const raceWeek = byWeek.get(plan.weeks - 1) ?? [];
      expect(raceWeek.filter((workout) => workout.type === 'STRENGTH')).toHaveLength(0);
    }
  });

  it('schedules canonical strength days and phase templates for the default plan', () => {
    const plan = generatePlan(fullConfig);
    const byWeek = workoutsByWeek(plan.workouts);
    const days = (week: number) =>
      (byWeek.get(week) ?? [])
        .filter((workout) => workout.type === 'STRENGTH')
        .map((workout) => weekdayOf(workout.date));
    const titles = (week: number) =>
      (byWeek.get(week) ?? []).filter((workout) => workout.type === 'STRENGTH').map((workout) => workout.title);
    expect(days(0)).toEqual([1, 5]);
    expect(days(5)).toEqual([1, 5]);
    expect(titles(0)).toEqual(['Snaga A — noge i core', 'Mobilnost 20 min']);
    expect(titles(5)).toEqual(['Snaga A — noge i core', 'Snaga B — glute i core']);
    expect(titles(13)).toEqual(['Snaga — održavanje', 'Mobilnost 20 min']);
    expect(days(15)).toEqual([1]);
    expect(days(16)).toEqual([1]);
    expect(days(17)).toEqual([]);
    expect(plan.workouts.filter((workout) => workout.type === 'STRENGTH')).toHaveLength(32);
    expect(plan.workouts).toHaveLength(126);
    expect(new Set(plan.workouts.map((workout) => workout.date)).size).toBe(126);
  });

  it('never exceeds the free rest days for lower training frequencies', () => {
    const plan = generatePlan({ ...fullConfig, daysPerWeek: 3 });
    for (const week of workoutsByWeek(plan.workouts).values()) {
      expect(week.filter((workout) => workout.type === 'STRENGTH').length).toBeLessThanOrEqual(2);
    }
  });
});
