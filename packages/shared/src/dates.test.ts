import { describe, expect, it } from 'vitest';
import { addDays, dayDiff, parseIso, startOfWeek, toIso, weekdayOf } from './dates';

describe('addDays', () => {
  it('crosses the Europe/Belgrade spring DST night without a day shift', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(dayDiff('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('crosses the Europe/Belgrade autumn DST night without a day shift', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(dayDiff('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('handles leap and non leap February', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('handles month and year boundaries', () => {
    expect(addDays('2026-04-30', 1)).toBe('2026-05-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('dayDiff', () => {
  it('returns signed whole days across month and year boundaries', () => {
    expect(dayDiff('2026-01-31', '2026-02-01')).toBe(1);
    expect(dayDiff('2026-12-31', '2027-01-01')).toBe(1);
    expect(dayDiff('2027-01-01', '2026-12-31')).toBe(-1);
    expect(dayDiff('2026-10-14', '2026-10-14')).toBe(0);
  });

  it('counts days in a leap year correctly', () => {
    expect(dayDiff('2028-02-28', '2028-03-01')).toBe(2);
    expect(dayDiff('2028-01-01', '2029-01-01')).toBe(366);
    expect(dayDiff('2026-01-01', '2027-01-01')).toBe(365);
  });
});

describe('weekdayOf', () => {
  it('uses Monday as day zero', () => {
    expect(weekdayOf('2026-01-05')).toBe(0);
    expect(weekdayOf('2026-01-11')).toBe(6);
    expect(weekdayOf('2026-03-29')).toBe(6);
    expect(weekdayOf('2026-10-25')).toBe(6);
  });
});

describe('startOfWeek', () => {
  it('returns Monday across DST transitions', () => {
    expect(startOfWeek('2026-03-28')).toBe('2026-03-23');
    expect(startOfWeek('2026-03-29')).toBe('2026-03-23');
    expect(startOfWeek('2026-03-30')).toBe('2026-03-30');
    expect(startOfWeek('2026-10-24')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26');
  });

  it('returns the same day for a Monday and stays stable on it', () => {
    expect(startOfWeek('2026-01-05')).toBe('2026-01-05');
    expect(startOfWeek(startOfWeek('2026-07-17'))).toBe('2026-07-13');
  });

  it('crosses the year boundary backwards', () => {
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28');
  });
});

describe('parseIso and toIso', () => {
  it('round-trips date only strings', () => {
    for (const iso of ['2026-01-01', '2026-10-14', '2028-02-29', '2026-12-31']) {
      expect(toIso(parseIso(iso))).toBe(iso);
    }
  });
});
