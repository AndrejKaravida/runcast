import { describe, expect, it } from 'vitest';
import { generatePlan } from './plan-generator';
import type { PlanConfig, VolumeBand, WorkoutDraft } from './types';

const QUALITY_TYPES = ['TEMPO', 'INTERVALS', 'REPETITIONS'];
const RUN_TYPES = ['EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'RACE'];
const MS_PER_DAY = 86_400_000;

function parseIso(iso: string): number {
  return new Date(`${iso}T00:00:00.000Z`).getTime();
}

function addDaysIso(iso: string, days: number): string {
  return new Date(parseIso(iso) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

function dayDiff(from: string, to: string): number {
  return Math.round((parseIso(to) - parseIso(from)) / MS_PER_DAY);
}

function weekday(iso: string): number {
  return (new Date(`${iso}T00:00:00.000Z`).getUTCDay() + 6) % 7;
}

const fullConfig: PlanConfig = {
  raceDate: '2026-05-10',
  startDate: '2026-01-05',
  daysPerWeek: 5,
  longRunDay: 6,
  experience: 'experienced',
  volumeBand: '40-60',
  anchor: { kind: 'goal', distanceKm: 42.195, timeSec: 13500 },
};

function weekKms(workouts: WorkoutDraft[]): number[] {
  const weeks = new Map<number, number>();
  for (const workout of workouts) {
    if (workout.type === 'RACE') continue;
    weeks.set(workout.weekIndex, (weeks.get(workout.weekIndex) ?? 0) + workout.distanceKm);
  }
  return [...weeks.entries()].sort((a, b) => a[0] - b[0]).map(([, km]) => Math.round(km * 10) / 10);
}

function qualityPerWeek(workouts: WorkoutDraft[]): Map<number, WorkoutDraft[]> {
  const map = new Map<number, WorkoutDraft[]>();
  for (const workout of workouts) {
    if (!QUALITY_TYPES.includes(workout.type)) continue;
    map.set(workout.weekIndex, [...(map.get(workout.weekIndex) ?? []), workout]);
  }
  return map;
}

function longKmByWeek(workouts: WorkoutDraft[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const workout of workouts) {
    if (workout.type === 'LONG') map.set(workout.weekIndex, workout.distanceKm);
  }
  return map;
}

describe('generatePlan', () => {
  it('throws when raceDate is not after startDate', () => {
    expect(() => generatePlan({ ...fullConfig, raceDate: '2026-01-01' })).toThrow('raceDate must be after startDate');
  });

  it('builds an 18-week plan covering every day exactly once', () => {
    const plan = generatePlan(fullConfig);
    expect(plan.weeks).toBe(18);
    expect(plan.workouts).toHaveLength(126);
    expect(plan.workouts[0].date).toBe('2026-01-05');
    expect(plan.workouts.at(-1)?.date).toBe('2026-05-10');
    const dates = plan.workouts.map((workout) => workout.date);
    expect(new Set(dates).size).toBe(dates.length);
    expect(plan.paces).not.toBeNull();
  });

  it('puts the race on the last day', () => {
    const plan = generatePlan(fullConfig);
    const last = plan.workouts.at(-1);
    expect(last?.type).toBe('RACE');
    expect(last?.date).toBe('2026-05-10');
    expect(last?.distanceKm).toBe(42.195);
  });

  it('keeps every long run on the chosen day', () => {
    const plan = generatePlan(fullConfig);
    for (const workout of plan.workouts) {
      if (workout.date === fullConfig.raceDate) continue;
      if (weekday(workout.date) === fullConfig.longRunDay) expect(workout.type).toBe('LONG');
    }
    expect(plan.workouts.filter((workout) => workout.type === 'LONG')).toHaveLength(17);
  });

  it('splits phases: no quality in base, two per week in build', () => {
    const plan = generatePlan(fullConfig);
    const quality = qualityPerWeek(plan.workouts);
    for (let week = 0; week < 5; week++) expect(quality.get(week) ?? []).toHaveLength(0);
    expect(quality.get(5)).toHaveLength(2);
    expect(new Set(quality.get(5)?.map((workout) => workout.type))).toEqual(new Set(['TEMPO', 'INTERVALS']));
    expect(quality.get(6)).toHaveLength(2);
    expect(new Set(quality.get(6)?.map((workout) => workout.type))).toEqual(new Set(['TEMPO', 'REPETITIONS']));
  });

  it('caps weekly volume growth at ten km and dips every fourth week', () => {
    const plan = generatePlan(fullConfig);
    const weeks = weekKms(plan.workouts);
    for (let i = 1; i < 15; i++) {
      if (i % 4 === 3 || (i - 1) % 4 === 3) continue;
      expect(weeks[i] - weeks[i - 1]).toBeLessThanOrEqual(10.5);
    }
    for (const cutback of [3, 7, 11]) {
      expect(weeks[cutback]).toBeLessThan(weeks[cutback - 1]);
    }
  });

  it('tapers over the last three weeks', () => {
    const plan = generatePlan(fullConfig);
    const weeks = weekKms(plan.workouts);
    const peak = Math.max(...weeks.slice(0, 15));
    expect(weeks[15]).toBeGreaterThan(peak * 0.75);
    expect(weeks[15]).toBeLessThan(peak * 0.85);
    expect(weeks[16]).toBeGreaterThan(peak * 0.55);
    expect(weeks[16]).toBeLessThan(peak * 0.65);
    expect(weeks[17]).toBeLessThan(weeks[16]);
    expect(weeks[17]).toBeLessThan(peak * 0.5);
  });

  it('respects three runs per week and a shifted long run day', () => {
    const plan = generatePlan({ ...fullConfig, daysPerWeek: 3, longRunDay: 0 });
    for (let week = 0; week < plan.weeks; week++) {
      const count = plan.workouts.filter(
        (workout) => workout.weekIndex === week && RUN_TYPES.includes(workout.type),
      ).length;
      expect(count).toBe(3);
    }
    for (const workout of plan.workouts) {
      if (workout.weekIndex === plan.weeks - 1) continue;
      if (weekday(workout.date) === 0) expect(workout.type).toBe('LONG');
    }
  });

  it('uses at most one quality session with four runs per week', () => {
    const plan = generatePlan({ ...fullConfig, daysPerWeek: 4 });
    for (const workouts of qualityPerWeek(plan.workouts).values()) {
      expect(workouts).toHaveLength(1);
    }
  });

  it('falls back to a pace-free base plan without an anchor', () => {
    const plan = generatePlan({ ...fullConfig, raceDate: '2026-03-15', anchor: null });
    expect(plan.paces).toBeNull();
    expect(plan.weeks).toBe(10);
    expect(plan.workouts).toHaveLength(70);
    expect(plan.workouts.some((workout) => QUALITY_TYPES.includes(workout.type))).toBe(false);
    expect(plan.workouts.at(-1)?.type).toBe('RACE');
  });

  it('keeps the anchor and paces when fewer than twelve weeks remain', () => {
    const plan = generatePlan({ ...fullConfig, raceDate: '2026-03-15' });
    expect(plan.anchor).not.toBeNull();
    expect(plan.paces).not.toBeNull();
    expect(plan.weeks).toBe(10);
    expect(plan.workouts.some((workout) => QUALITY_TYPES.includes(workout.type))).toBe(false);
  });

  it('prepends base weeks beyond eighteen weeks', () => {
    const plan = generatePlan({ ...fullConfig, raceDate: '2026-05-24' });
    expect(plan.weeks).toBe(20);
    expect(plan.workouts).toHaveLength(140);
    const quality = qualityPerWeek(plan.workouts);
    expect(quality.get(0) ?? []).toHaveLength(0);
    expect(quality.get(1) ?? []).toHaveLength(0);
    expect(plan.workouts.filter((workout) => workout.weekIndex === 0 && workout.phase !== 'BASE')).toHaveLength(0);
  });
});

describe('generatePlan weekday alignment', () => {
  it('anchors the plan weeks to the race date for non-Monday starts', () => {
    const plan = generatePlan({ ...fullConfig, startDate: '2026-01-07' });
    expect(plan.workouts[0].date).toBe('2026-01-07');
    expect(plan.workouts.at(-1)?.date).toBe('2026-05-10');
    for (const workout of plan.workouts) {
      if (workout.date === fullConfig.raceDate) continue;
      if (weekday(workout.date) === fullConfig.longRunDay) expect(workout.type).toBe('LONG');
    }
    const longRuns = plan.workouts.filter((workout) => workout.type === 'LONG');
    expect(longRuns.length).toBeGreaterThanOrEqual(16);
  });

  it('keeps long runs at least a week away from the race for every race weekday', () => {
    for (let offset = 0; offset < 7; offset++) {
      const raceDate = addDaysIso('2026-05-11', offset);
      const plan = generatePlan({ ...fullConfig, raceDate });
      const longRuns = plan.workouts.filter((workout) => workout.type === 'LONG');
      for (const longRun of longRuns) {
        expect(dayDiff(longRun.date, raceDate)).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('covers the whole window exactly once when the race is 18 weeks away on the same weekday', () => {
    const plan = generatePlan({ ...fullConfig, startDate: '2026-01-04', raceDate: '2026-05-10', longRunDay: 5 });
    expect(plan.workouts[0].date).toBe('2026-01-04');
    expect(plan.workouts.at(-1)?.date).toBe('2026-05-10');
    const dates = plan.workouts.map((workout) => workout.date);
    expect(new Set(dates).size).toBe(dates.length);
    expect(dates).toHaveLength(dayDiff('2026-01-04', '2026-05-10') + 1);
    for (const longRun of plan.workouts.filter((workout) => workout.type === 'LONG')) {
      expect(dayDiff(longRun.date, '2026-05-10')).toBeGreaterThanOrEqual(7);
    }
  });

  it('never places quality sessions adjacent to the long run', () => {
    for (let longRunDay = 0; longRunDay < 7; longRunDay++) {
      const plan = generatePlan({ ...fullConfig, longRunDay });
      const forbidden = new Set([(longRunDay + 6) % 7, longRunDay, (longRunDay + 1) % 7]);
      for (const workout of plan.workouts) {
        if (!QUALITY_TYPES.includes(workout.type)) continue;
        expect(forbidden.has(weekday(workout.date))).toBe(false);
      }
    }
  });

  it('uses the configured race distance', () => {
    const plan = generatePlan({ ...fullConfig, distanceKm: 21.0975 });
    const race = plan.workouts.at(-1);
    expect(race?.type).toBe('RACE');
    expect(race?.distanceKm).toBe(21.0975);
    expect(race?.steps[0].label).toContain('21,1');
  });
});

describe('generatePlan long-run-first calibration', () => {
  function calibratedPlan(partial: Partial<PlanConfig>) {
    return generatePlan({
      ...fullConfig,
      anchor: { kind: 'goal', distanceKm: 42.195, timeSec: 13500 },
      daysPerWeek: 4,
      longRunDay: 0,
      experience: 'experienced',
      volumeBand: 'lt20',
      ...partial,
    });
  }

  it('elevates an lt20 marathon plan to a 30 km long run and a 50+ km peak week', () => {
    const plan = calibratedPlan({ experience: 'first' });
    const weeks = weekKms(plan.workouts);
    const longs = [...longKmByWeek(plan.workouts).values()];
    expect(Math.max(...longs)).toBeGreaterThanOrEqual(28);
    expect(Math.max(...weeks)).toBeGreaterThanOrEqual(50);
  });

  it('respects the first-time caps of 60 km weekly and 30 km long', () => {
    for (const volumeBand of ['20-40', '40-60'] as const) {
      const plan = calibratedPlan({ experience: 'first', volumeBand });
      const weeks = weekKms(plan.workouts);
      const longs = [...longKmByWeek(plan.workouts).values()];
      expect(Math.max(...weeks)).toBeLessThanOrEqual(60.5);
      expect(Math.max(...longs)).toBeLessThanOrEqual(30);
    }
  });

  it('reaches at least a 30 km long run for a 20-40 marathon runner', () => {
    const plan = calibratedPlan({ volumeBand: '20-40' });
    const longs = [...longKmByWeek(plan.workouts).values()];
    expect(Math.max(...longs)).toBeGreaterThanOrEqual(30);
  });

  it('keeps half marathon long runs in the 18-21 km range', () => {
    for (const volumeBand of ['lt20', '20-40', '40-60', 'gt60'] as const) {
      const plan = calibratedPlan({
        volumeBand,
        distanceKm: 21.0975,
        anchor: { kind: 'goal', distanceKm: 21.0975, timeSec: 6300 },
      });
      const longs = [...longKmByWeek(plan.workouts).values()];
      expect(Math.max(...longs)).toBeGreaterThanOrEqual(18);
      expect(Math.max(...longs)).toBeLessThanOrEqual(21);
    }
  });

  it('scales long runs by race distance for 5K and 10K plans', () => {
    const targets: Record<VolumeBand, { fiveK: number; tenK: number }> = {
      lt20: { fiveK: 8, tenK: 11 },
      '20-40': { fiveK: 10, tenK: 12 },
      '40-60': { fiveK: 14, tenK: 15 },
      gt60: { fiveK: 14, tenK: 18 },
    };
    for (const volumeBand of Object.keys(targets) as VolumeBand[]) {
      for (const distanceKm of [5, 10] as const) {
        const plan = calibratedPlan({ volumeBand, distanceKm });
        const peak = Math.max(...longKmByWeek(plan.workouts).values());
        const target = distanceKm === 5 ? targets[volumeBand].fiveK : targets[volumeBand].tenK;
        expect(peak).toBeGreaterThanOrEqual(target - 0.5);
        expect(peak).toBeLessThanOrEqual(target + 0.5);
      }
    }
    const fiveK = calibratedPlan({ distanceKm: 5 });
    expect(Math.max(...weekKms(fiveK.workouts))).toBeLessThanOrEqual(26);
  });

  it('peaks the long run three weeks before the race and skips race week', () => {
    const plan = calibratedPlan({});
    const longs = longKmByWeek(plan.workouts);
    const peak = Math.max(...longs.values());
    expect(longs.get(plan.weeks - 4)).toBe(peak);
    expect(longs.get(plan.weeks - 3)).toBeCloseTo(peak * 0.7, 0);
    expect(longs.get(plan.weeks - 2)).toBeCloseTo(peak * 0.5, 0);
    expect(longs.has(plan.weeks - 1)).toBe(false);
  });

  it('caps anchor-free base plans at 18 km long runs', () => {
    const plan = generatePlan({ ...fullConfig, raceDate: '2026-03-15', anchor: null });
    const longs = [...longKmByWeek(plan.workouts).values()];
    expect(Math.max(...longs)).toBeGreaterThanOrEqual(16);
    expect(Math.max(...longs)).toBeLessThanOrEqual(18);
  });

  it('never lets the long run exceed 58% of the peak weekly volume', () => {
    for (const volumeBand of ['lt20', '20-40', '40-60', 'gt60'] as const) {
      const plan = calibratedPlan({ volumeBand });
      const peakWeek = Math.max(...weekKms(plan.workouts));
      const peakLong = Math.max(...longKmByWeek(plan.workouts).values());
      expect(peakLong / peakWeek).toBeLessThanOrEqual(0.58);
    }
  });
});

describe('generatePlan paces', () => {
  it('attaches zone paces to workouts', () => {
    const plan = generatePlan(fullConfig);
    const tempo = plan.workouts.find((workout) => workout.type === 'TEMPO');
    expect(tempo?.paceZone).toBe('T');
    expect(tempo?.steps[1].pace).toMatch(/^\d+:\d{2}$/);
    const easy = plan.workouts.find((workout) => workout.type === 'EASY');
    expect(easy?.paceZone).toBe('E');
    const longRun = plan.workouts.find((workout) => workout.type === 'LONG');
    expect(longRun?.steps[0].pace).toMatch(/^\d+:\d{2}$/);
  });
});
