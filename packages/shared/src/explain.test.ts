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
  it('vraća kompletan set ključeva za svaki tip i fazu', () => {
    for (const type of WORKOUT_TYPES) {
      for (const phase of PHASES) {
        const result = explain(type, phase);
        expect(result.why.key).toBe(`content:explain.types.${type}.${type === 'LONG' ? 'whyWithDistance' : 'why'}`);
        expect(result.mistake.key).toBe(`content:explain.types.${type}.mistake`);
        expect(result.effortLabel.key).toBe(`content:explain.types.${type}.effortLabel`);
        expect(result.how).toHaveLength(2);
        expect(result.how[0].key).toBe(`content:explain.types.${type}.how.0`);
        expect(result.how[1].key).toBe(`content:explain.types.${type}.how.1`);
        expect(result.why.suffix?.key).toBe(`content:explain.phase.${phase}`);
      }
    }
  });

  it('faza menja sufiks, a tip ostaje isti', () => {
    expect(explain('EASY', 'BASE').why.suffix?.key).not.toBe(explain('EASY', 'TAPER').why.suffix?.key);
    expect(explain('EASY', 'BASE').why.key).toBe(explain('EASY', 'TAPER').why.key);
    expect(explain('LONG', 'BUILD').why.suffix?.key).not.toBe(explain('LONG', 'PEAK').why.suffix?.key);
    expect(explain('REST', 'BASE').why.suffix?.key).not.toBe(explain('REST', 'RACE').why.suffix?.key);
  });

  it('dodaje tempo iz plana kao sufiks prvog koraka', () => {
    const result = describeWorkout({ type: 'TEMPO', phase: 'BUILD', paceZone: 'T', distanceKm: 8 }, { paces });
    expect(result.how[0].suffix?.key).toBe('content:explain.paceSuffix');
    expect(result.how[0].suffix?.params).toEqual({ zone: 'T', pace: formatPace(paces.thresholdSecPerKm) });
    expect(result.how[1].suffix).toBeUndefined();
  });

  it('bez paces nema tempa u koracima', () => {
    for (const type of WORKOUT_TYPES) {
      for (const phase of PHASES) {
        const result = explain(type, phase);
        expect(result.how.every((item) => item.suffix === undefined)).toBe(true);
      }
    }
  });

  it('LONG nosi distancu, a REST i STRENGTH rade bez zone', () => {
    const long = explain('LONG', 'BUILD');
    expect(long.why.key).toBe('content:explain.types.LONG.whyWithDistance');
    expect(long.why.params).toEqual({ km: 18 });

    const rest = explain('REST', 'BASE');
    expect(rest.why.suffix?.key).toBe('content:explain.phase.BASE');
    expect(rest.how.every((item) => item.suffix === undefined)).toBe(true);

    const strength = describeWorkout({ type: 'STRENGTH', phase: 'BUILD', paceZone: null, distanceKm: 0 }, { paces });
    expect(strength.how).toHaveLength(2);
    expect(strength.how.every((item) => item.suffix === undefined)).toBe(true);
  });

  it('sufiks napora ide samo u TAPER i RACE fazi', () => {
    expect(explain('EASY', 'TAPER').effortCue.suffix?.key).toBe('content:explain.effortSuffix.TAPER');
    expect(explain('EASY', 'RACE').effortCue.suffix?.key).toBe('content:explain.effortSuffix.RACE');
    expect(explain('EASY', 'BUILD').effortCue.suffix).toBeUndefined();
  });
});
