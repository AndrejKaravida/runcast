import { describe, expect, it } from 'vitest';
import { isoDateSchema, onboardingSchema, parseTimeToSeconds, profileSchema, runLogSchema } from './schemas';

const validOnboarding = {
  city: 'Belgrade',
  lat: 44.8,
  lon: 20.4,
  experience: 'first',
  volumeBand: 'lt20',
  daysPerWeek: 3,
  longRunDay: 6,
};

describe('parseTimeToSeconds', () => {
  it('parses h:mm and h:mm:ss', () => {
    expect(parseTimeToSeconds('3:45:00')).toBe(13500);
    expect(parseTimeToSeconds('45:30')).toBe(2730);
  });

  it('throws for invalid input', () => {
    expect(() => parseTimeToSeconds('x')).toThrow('Invalid time');
  });

  it('rejects impossible minute and second values', () => {
    expect(() => parseTimeToSeconds('99:99')).toThrow('Invalid time');
    expect(() => parseTimeToSeconds('3:75:00')).toThrow('Invalid time');
    expect(parseTimeToSeconds('90:30')).toBe(5430);
  });
});

describe('isoDateSchema', () => {
  it('rejects impossible calendar dates', () => {
    expect(isoDateSchema.safeParse('2026-02-31').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-13-01').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-02-28').success).toBe(true);
    expect(isoDateSchema.safeParse('2024-02-29').success).toBe(true);
  });
});

describe('onboardingSchema', () => {
  it('accepts minimal input and fills defaults', () => {
    const parsed = onboardingSchema.parse(validOnboarding);
    expect(parsed.runWindow).toBe('morning');
    expect(parsed.weatherRefreshMinutes).toBe(60);
    expect(parsed.units).toBe('km');
  });

  it('rejects out-of-range training days', () => {
    expect(onboardingSchema.safeParse({ ...validOnboarding, daysPerWeek: 2 }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...validOnboarding, daysPerWeek: 7 }).success).toBe(false);
  });

  it('rejects out-of-range weight', () => {
    expect(onboardingSchema.safeParse({ ...validOnboarding, weightKg: 10 }).success).toBe(false);
  });
});

describe('profileSchema', () => {
  it('rejects out-of-range latitude', () => {
    expect(profileSchema.safeParse({ ...validOnboarding, lat: 100 }).success).toBe(false);
  });
});

describe('runLogSchema', () => {
  it('rejects out-of-range rpe', () => {
    expect(runLogSchema.safeParse({ distanceKm: 10, durationSec: 3000, rpe: 0 }).success).toBe(false);
    expect(runLogSchema.safeParse({ distanceKm: 10, durationSec: 3000, rpe: 11 }).success).toBe(false);
  });
});
