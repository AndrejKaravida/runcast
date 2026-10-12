import { describe, expect, it } from 'vitest';
import { describeWorkout } from './explain';
import { formatPace } from './vdot';
import type { PaceZone, PlanPaces, PlanPhase, WorkoutType } from './types';

const WORKOUT_TYPES: WorkoutType[] = ['EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'REST', 'RACE', 'STRENGTH'];

const PHASES: PlanPhase[] = ['BASE', 'BUILD', 'PEAK', 'TAPER', 'RACE'];

const paces: PlanPaces = {
  easySlowSecPerKm: 389,
  easyFastSecPerKm: 325,
  marathonSecPerKm: 306,
  thresholdSecPerKm: 288,
  intervalSecPerKm: 260,
  repetitionSecPerKm: 240,
};

function explain(type: WorkoutType, phase: PlanPhase, paceZone: PaceZone | null = null) {
  const distanceKm = type === 'LONG' ? 18 : type === 'EASY' ? 8 : 0;
  return describeWorkout({ type, phase, paceZone, distanceKm });
}

describe('describeWorkout', () => {
  it('vraća kompletan sadržaj za svaki tip i fazu', () => {
    for (const type of WORKOUT_TYPES) {
      for (const phase of PHASES) {
        const result = explain(type, phase);
        expect(result.why.length).toBeGreaterThan(0);
        expect(result.mistake.length).toBeGreaterThan(0);
        expect(result.effort).toContain('RPE');
        expect(result.how.length).toBeGreaterThanOrEqual(2);
        for (const item of result.how) expect(item.length).toBeGreaterThan(0);
      }
    }
  });

  it('tekst se razlikuje po fazi', () => {
    expect(explain('EASY', 'BASE').why).not.toBe(explain('EASY', 'TAPER').why);
    expect(explain('LONG', 'BUILD').why).not.toBe(explain('LONG', 'PEAK').why);
    expect(explain('REST', 'BASE').why).not.toBe(explain('REST', 'RACE').why);
  });

  it('dodaje tempo iz plana u prvi korak', () => {
    const result = describeWorkout({ type: 'TEMPO', phase: 'BUILD', paceZone: 'T', distanceKm: 8 }, { paces });
    expect(result.how[0]).toContain(formatPace(paces.thresholdSecPerKm));
    expect(result.how[0]).toContain('/km');
  });

  it('bez paces nema tempo brojeva', () => {
    for (const type of WORKOUT_TYPES) {
      for (const phase of PHASES) {
        const result = explain(type, phase);
        expect(result.how.some((item) => item.includes('/km'))).toBe(false);
      }
    }
  });

  it('LONG nosi distancu, a REST i STRENGTH rade bez zone', () => {
    expect(explain('LONG', 'BUILD').why).toContain('18');
    const rest = explain('REST', 'BASE');
    expect(rest.why.length).toBeGreaterThan(0);
    expect(rest.how.some((item) => item.includes('/km'))).toBe(false);
    const strength = describeWorkout({ type: 'STRENGTH', phase: 'BUILD', paceZone: null, distanceKm: 0 }, { paces });
    expect(strength.how).toHaveLength(2);
    expect(strength.how.some((item) => item.includes('/km'))).toBe(false);
  });
});
