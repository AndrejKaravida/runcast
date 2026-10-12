import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatPace,
  pacesFromVdot,
  vdotFromPerformance,
  vdotVelocityMetersPerMinute,
  vo2OfVelocity,
} from './vdot';

describe('vdotFromPerformance', () => {
  it('computes VDOT for a 5K performance', () => {
    const vdot = vdotFromPerformance(5, 1500);
    expect(vdot).toBeGreaterThan(37.6);
    expect(vdot).toBeLessThan(39);
  });

  it('computes VDOT for a 10K performance', () => {
    const vdot = vdotFromPerformance(10, 3000);
    expect(vdot).toBeGreaterThan(39);
    expect(vdot).toBeLessThan(41);
  });

  it('matches published Daniels anchors', () => {
    expect(vdotFromPerformance(5, 1200)).toBeGreaterThan(49.4);
    expect(vdotFromPerformance(5, 1200)).toBeLessThan(50.2);
    expect(vdotFromPerformance(10, 2700)).toBeGreaterThan(45.0);
    expect(vdotFromPerformance(10, 2700)).toBeLessThan(45.6);
    expect(vdotFromPerformance(21.0975, 6300)).toBeGreaterThan(42.3);
    expect(vdotFromPerformance(21.0975, 6300)).toBeLessThan(42.9);
    expect(vdotFromPerformance(42.195, 12600)).toBeGreaterThan(44.3);
    expect(vdotFromPerformance(42.195, 12600)).toBeLessThan(44.9);
  });

  it('rejects non-positive inputs', () => {
    expect(() => vdotFromPerformance(0, 1500)).toThrow('distance and time must be positive');
    expect(() => vdotFromPerformance(5, 0)).toThrow('distance and time must be positive');
  });
});

describe('vdotVelocityMetersPerMinute', () => {
  it('round-trips through vo2OfVelocity', () => {
    for (const vdot of [30, 45, 60, 75]) {
      expect(vo2OfVelocity(vdotVelocityMetersPerMinute(vdot))).toBeCloseTo(vdot, 1);
    }
  });
});

describe('pacesFromVdot', () => {
  it('returns ordered zones within sane bounds', () => {
    const paces = pacesFromVdot(45);
    expect(paces.easySlowSecPerKm).toBeGreaterThan(paces.easyFastSecPerKm);
    expect(paces.thresholdSecPerKm).toBeLessThan(paces.marathonSecPerKm);
    expect(paces.intervalSecPerKm).toBeLessThan(paces.thresholdSecPerKm);
    expect(paces.repetitionSecPerKm).toBeLessThan(paces.intervalSecPerKm);
    for (const pace of Object.values(paces)) {
      expect(pace).toBeGreaterThan(150);
      expect(pace).toBeLessThan(700);
    }
  });

  it('matches the Daniels pace table for VDOT 44', () => {
    const paces = pacesFromVdot(44);
    expect(Math.abs(paces.easySlowSecPerKm - 389)).toBeLessThanOrEqual(8);
    expect(Math.abs(paces.easyFastSecPerKm - 325)).toBeLessThanOrEqual(8);
    expect(Math.abs(paces.marathonSecPerKm - 306)).toBeLessThanOrEqual(8);
    expect(Math.abs(paces.thresholdSecPerKm - 288)).toBeLessThanOrEqual(8);
    expect(Math.abs(paces.intervalSecPerKm - 260)).toBeLessThanOrEqual(8);
    expect(Math.abs(paces.repetitionSecPerKm - 239)).toBeLessThanOrEqual(8);
  });
});

describe('formatting', () => {
  it('formats pace as m:ss', () => {
    expect(formatPace(312)).toBe('5:12');
    expect(formatPace(300)).toBe('5:00');
  });

  it('formats duration as h:mm:ss when an hour or more', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(312)).toBe('5:12');
  });
});
