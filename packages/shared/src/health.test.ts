import { describe, expect, it } from 'vitest';
import { classifyRun, matchWorkoutId, toLogDate, type HealthRun, type WorkoutRef } from './health';

const TZ = 'Europe/Belgrade';

function run(overrides: Partial<HealthRun> = {}): HealthRun {
  return {
    date: '2026-10-13T12:00:00.000Z',
    distanceKm: 10,
    durationSec: 3000,
    externalId: 'hk-run-1',
    source: 'healthkit',
    sourceName: 'Apple Watch',
    ...overrides,
  };
}

function workout(overrides: Partial<WorkoutRef> = {}): WorkoutRef {
  return {
    id: 'workout-1',
    workout_date: '2026-10-13',
    type: 'LONG',
    status: 'PLANNED',
    ...overrides,
  };
}

const importedRun = run({ externalId: 'hk-run-9' });

describe('classifyRun', () => {
  it('imports a run with no matching log or external id', () => {
    expect(classifyRun(run(), { existing: [], importedExternalIds: [] }, TZ)).toBe('import');
  });

  it('marks a run as imported when the external id was already imported', () => {
    expect(classifyRun(importedRun, { existing: [], importedExternalIds: ['hk-run-9'] }, TZ)).toBe('imported');
  });

  it('marks a run as imported regardless of the log date', () => {
    expect(
      classifyRun(
        importedRun,
        {
          existing: [{ log_date: '2020-01-01', distance_km: 42, duration_sec: 100 }],
          importedExternalIds: ['hk-run-9'],
        },
        TZ,
      ),
    ).toBe('imported');
  });

  it('marks a run as duplicate when day, distance and duration match', () => {
    expect(
      classifyRun(
        run(),
        {
          existing: [{ log_date: '2026-10-13', distance_km: 10.03, duration_sec: 2950 }],
          importedExternalIds: [],
        },
        TZ,
      ),
    ).toBe('duplicate');
  });

  it('accepts the distance tolerance boundary and rejects beyond it', () => {
    const near = run({ distanceKm: 10.05 });
    const far = run({ distanceKm: 10.06 });
    const log = { log_date: '2026-10-13', distance_km: 10, duration_sec: 3000 };
    expect(classifyRun(near, { existing: [log], importedExternalIds: [] }, TZ)).toBe('duplicate');
    expect(classifyRun(far, { existing: [log], importedExternalIds: [] }, TZ)).toBe('import');
  });

  it('accepts the duration tolerance boundary and rejects beyond it', () => {
    const near = run({ durationSec: 3060 });
    const far = run({ durationSec: 3061 });
    const log = { log_date: '2026-10-13', distance_km: 10, duration_sec: 3000 };
    expect(classifyRun(near, { existing: [log], importedExternalIds: [] }, TZ)).toBe('duplicate');
    expect(classifyRun(far, { existing: [log], importedExternalIds: [] }, TZ)).toBe('import');
  });

  it('falls back to duration for a run without distance', () => {
    const treadmill = run({ distanceKm: null });
    expect(
      classifyRun(
        treadmill,
        {
          existing: [{ log_date: '2026-10-13', distance_km: null, duration_sec: 2990 }],
          importedExternalIds: [],
        },
        TZ,
      ),
    ).toBe('duplicate');
    expect(
      classifyRun(
        treadmill,
        {
          existing: [{ log_date: '2026-10-13', distance_km: null, duration_sec: 3100 }],
          importedExternalIds: [],
        },
        TZ,
      ),
    ).toBe('import');
  });

  it('does not match a log from another day', () => {
    expect(
      classifyRun(
        run(),
        {
          existing: [{ log_date: '2026-10-12', distance_km: 10, duration_sec: 3000 }],
          importedExternalIds: [],
        },
        TZ,
      ),
    ).toBe('import');
  });

  it('does not match a log without duration', () => {
    expect(
      classifyRun(
        run(),
        {
          existing: [{ log_date: '2026-10-13', distance_km: 10, duration_sec: null }],
          importedExternalIds: [],
        },
        TZ,
      ),
    ).toBe('import');
  });

  it('matches the log of the local day when the zone is behind UTC', () => {
    const eveningRun = run({ date: '2026-10-13T02:00:00.000Z' });
    const existing = [{ log_date: '2026-10-12', distance_km: 10, duration_sec: 3000 }];
    expect(classifyRun(eveningRun, { existing, importedExternalIds: [] }, 'America/Los_Angeles')).toBe('duplicate');
    expect(classifyRun(eveningRun, { existing, importedExternalIds: [] }, 'UTC')).toBe('import');
    expect(classifyRun(eveningRun, { existing, importedExternalIds: [] }, TZ)).toBe('import');
  });
});

describe('toLogDate', () => {
  it('uses the local day when the run starts after midnight local time', () => {
    const lateRun = run({ date: '2026-10-13T22:30:00.000Z' });
    expect(toLogDate(lateRun, 'Europe/Belgrade')).toBe('2026-10-14');
    expect(toLogDate(lateRun, 'UTC')).toBe('2026-10-13');
    expect(toLogDate(lateRun, 'America/Los_Angeles')).toBe('2026-10-13');
  });

  it('keeps a run just before local midnight on its own day', () => {
    const nightRun = run({ date: '2026-10-12T21:59:00.000Z' });
    expect(toLogDate(nightRun, 'Europe/Belgrade')).toBe('2026-10-12');
  });
});

describe('matchWorkoutId', () => {
  it('returns the only planned run workout of the day', () => {
    expect(matchWorkoutId(run(), [workout(), workout({ id: 'strength', type: 'STRENGTH' })], TZ)).toBe('workout-1');
  });

  it('returns a done run workout', () => {
    expect(matchWorkoutId(run({ distanceKm: null }), [workout({ status: 'DONE' })], TZ)).toBe('workout-1');
  });

  it('returns null when two run workouts share the day', () => {
    expect(matchWorkoutId(run(), [workout(), workout({ id: 'workout-2', type: 'EASY' })], TZ)).toBeNull();
  });

  it('ignores skipped and non run workouts', () => {
    expect(
      matchWorkoutId(run(), [workout({ status: 'SKIPPED' }), workout({ id: 's', type: 'STRENGTH' })], TZ),
    ).toBeNull();
  });

  it('ignores workouts on other days', () => {
    expect(matchWorkoutId(run(), [workout({ workout_date: '2026-10-12' })], TZ)).toBeNull();
  });

  it('matches the workout of the local day when the zone is behind UTC', () => {
    const eveningRun = run({ date: '2026-10-13T02:00:00.000Z' });
    expect(matchWorkoutId(eveningRun, [workout({ workout_date: '2026-10-12' })], 'America/Los_Angeles')).toBe(
      'workout-1',
    );
    expect(matchWorkoutId(eveningRun, [workout({ workout_date: '2026-10-12' })], TZ)).toBeNull();
  });
});
