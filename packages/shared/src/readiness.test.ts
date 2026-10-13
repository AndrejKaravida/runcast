import { describe, expect, it } from 'vitest';
import { computeReadiness, type ReadinessBaseline } from './readiness';

function baseline(overrides: Partial<ReadinessBaseline> = {}): ReadinessBaseline {
  return { rhrAvg: null, hrvAvg: null, ...overrides };
}

describe('computeReadiness sleep', () => {
  it('marks short sleep as tired with a hint', () => {
    const result = computeReadiness({ sleepHours: 5, restingHr: null, hrv: null, baseline: null });
    expect(result.level).toBe('tired');
    expect(result.score).toBe(40);
    expect(result.hints).toEqual([{ key: 'today:readiness.hints.sleepShort', params: { hours: '5' } }]);
  });

  it('humanizes fractional sleep hours in the hint', () => {
    const result = computeReadiness({ sleepHours: 5.25, restingHr: null, hrv: null, baseline: null });
    expect(result.hints[0].params).toEqual({ hours: '5,3' });
  });

  it('keeps moderate sleep at normal', () => {
    const result = computeReadiness({ sleepHours: 6.5, restingHr: null, hrv: null, baseline: null });
    expect(result.level).toBe('normal');
    expect(result.score).toBe(70);
    expect(result.hints).toEqual([]);
  });

  it('marks seven hours as fresh', () => {
    const result = computeReadiness({ sleepHours: 7, restingHr: null, hrv: null, baseline: null });
    expect(result.level).toBe('fresh');
    expect(result.score).toBe(90);
  });

  it('marks long sleep as fresh with a full score', () => {
    const result = computeReadiness({ sleepHours: 8.5, restingHr: null, hrv: null, baseline: null });
    expect(result.level).toBe('fresh');
    expect(result.score).toBe(100);
  });

  it('stays normal without sleep even when HRV and RHR exist', () => {
    const result = computeReadiness({
      sleepHours: null,
      restingHr: 48,
      hrv: 62,
      baseline: baseline({ rhrAvg: 50, hrvAvg: 60 }),
    });
    expect(result.level).toBe('normal');
    expect(result.score).toBe(100);
    expect(result.hints).toEqual([]);
  });
});

describe('computeReadiness baseline hints', () => {
  it('ignores a HRV ratio at the ten percent boundary', () => {
    const result = computeReadiness({
      sleepHours: 7.5,
      restingHr: null,
      hrv: 54,
      baseline: baseline({ hrvAvg: 60 }),
    });
    expect(result.hints).toEqual([]);
    expect(result.score).toBe(90);
  });

  it('hints when HRV drops more than ten percent below the average', () => {
    const result = computeReadiness({
      sleepHours: 7.5,
      restingHr: null,
      hrv: 53.4,
      baseline: baseline({ hrvAvg: 60 }),
    });
    expect(result.level).toBe('normal');
    expect(result.score).toBe(70);
    expect(result.hints).toEqual([{ key: 'today:readiness.hints.hrvLow', params: { pct: 11 } }]);
  });

  it('ignores a resting heart rate at the seven bpm boundary', () => {
    const result = computeReadiness({
      sleepHours: 7.5,
      restingHr: 57,
      hrv: null,
      baseline: baseline({ rhrAvg: 50 }),
    });
    expect(result.hints).toEqual([]);
    expect(result.score).toBe(90);
  });

  it('hints when resting heart rate is more than seven bpm above the average', () => {
    const result = computeReadiness({
      sleepHours: 7.5,
      restingHr: 58.4,
      hrv: null,
      baseline: baseline({ rhrAvg: 50 }),
    });
    expect(result.level).toBe('normal');
    expect(result.score).toBe(70);
    expect(result.hints).toEqual([{ key: 'today:readiness.hints.rhrHigh', params: { bpm: 8 } }]);
  });

  it('drops to tired when both signals are off', () => {
    const result = computeReadiness({
      sleepHours: 7.5,
      restingHr: 60,
      hrv: 45,
      baseline: baseline({ rhrAvg: 50, hrvAvg: 60 }),
    });
    expect(result.level).toBe('tired');
    expect(result.score).toBe(50);
    expect(result.hints).toHaveLength(2);
  });

  it('caps hints at two lines', () => {
    const result = computeReadiness({
      sleepHours: 5,
      restingHr: 60,
      hrv: 45,
      baseline: baseline({ rhrAvg: 50, hrvAvg: 60 }),
    });
    expect(result.hints.map((hint) => hint.key)).toEqual([
      'today:readiness.hints.sleepShort',
      'today:readiness.hints.hrvLow',
    ]);
  });

  it('does not penalize missing baseline metrics', () => {
    const result = computeReadiness({
      sleepHours: 7.5,
      restingHr: 80,
      hrv: 20,
      baseline: baseline(),
    });
    expect(result.score).toBe(90);
    expect(result.hints).toEqual([]);
  });

  it('never returns a score below zero', () => {
    const result = computeReadiness({
      sleepHours: 4,
      restingHr: 70,
      hrv: 10,
      baseline: baseline({ rhrAvg: 50, hrvAvg: 60 }),
    });
    expect(result.score).toBe(0);
    expect(result.level).toBe('tired');
  });
});
