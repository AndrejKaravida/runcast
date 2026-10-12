import { describe, expect, it } from 'vitest';
import { buildCoachInsights, clampScaleFactor, type CoachLog, type CoachWorkout } from './coach';

const TODAY = '2026-03-16';
const RACE = '2026-06-01';
const TARGET_WEEK_START = '2026-03-23';
const LAST_WEEK_START = '2026-03-09';

const NEXT_WEEK_RUN = workout({ id: 'next-week-run', workout_date: TARGET_WEEK_START, distance_km: 8 });

function workout(overrides: Partial<CoachWorkout> & Pick<CoachWorkout, 'workout_date'>): CoachWorkout {
  return {
    id: `w-${overrides.workout_date}-${overrides.type ?? 'EASY'}-${overrides.status ?? 'PLANNED'}`,
    type: 'EASY',
    distance_km: 5,
    status: 'PLANNED',
    ...overrides,
  };
}

function log(overrides: Partial<CoachLog> & Pick<CoachLog, 'log_date'>): CoachLog {
  return { rpe: 5, distance_km: 5, ...overrides };
}

function build(workouts: CoachWorkout[], logs: CoachLog[] = [], raceDate = RACE) {
  return buildCoachInsights({ workouts, logs, today: TODAY, plan: { raceDate } });
}

function ratedLogs(dates: string[], rpe: number): CoachLog[] {
  return dates.map((log_date) => log({ log_date, rpe }));
}

describe('buildCoachInsights', () => {
  it('returns no insights and a zeroed recap without data', () => {
    const { insights, recap } = build([]);
    expect(insights).toEqual([]);
    expect(recap).toEqual({
      weekStart: LAST_WEEK_START,
      plannedKm: 0,
      doneKm: 0,
      plannedSessions: 0,
      doneSessions: 0,
      longestKm: 0,
      adherencePct: 0,
    });
  });

  it('builds the previous-week recap and ignores strength and rest', () => {
    const { recap } = build([
      workout({ workout_date: '2026-03-10', distance_km: 5.5, status: 'DONE' }),
      workout({ workout_date: '2026-03-12', type: 'TEMPO', distance_km: 8, status: 'SKIPPED' }),
      workout({ workout_date: '2026-03-15', type: 'LONG', distance_km: 12, status: 'DONE' }),
      workout({ workout_date: '2026-03-11', type: 'STRENGTH', distance_km: 0, status: 'DONE' }),
      workout({ workout_date: '2026-03-13', type: 'REST', distance_km: 0 }),
    ]);
    expect(recap).toEqual({
      weekStart: LAST_WEEK_START,
      plannedKm: 25.5,
      doneKm: 17.5,
      plannedSessions: 3,
      doneSessions: 2,
      longestKm: 12,
      adherencePct: 67,
    });
  });

  it('fires a missed-runs warning with a 0.8 action for two missed runs', () => {
    const { insights } = build([
      workout({ workout_date: '2026-03-12', status: 'SKIPPED' }),
      workout({ workout_date: '2026-03-14' }),
      NEXT_WEEK_RUN,
    ]);
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe('missed-runs');
    expect(insights[0].tone).toBe('warning');
    expect(insights[0].action).toEqual({ kind: 'scale-week', weekStart: TARGET_WEEK_START, factor: 0.8 });
  });

  it('does not fire for a single missed run or for today', () => {
    expect(build([workout({ workout_date: '2026-03-14', status: 'SKIPPED' })], [], RACE).insights).toEqual([]);
    expect(
      build([workout({ workout_date: TODAY }), workout({ workout_date: '2026-03-15', status: 'SKIPPED' })], [], RACE)
        .insights,
    ).toEqual([]);
  });

  it('fires a high-RPE warning for an average of at least 8.5', () => {
    const { insights } = build(
      [NEXT_WEEK_RUN],
      ratedLogs(['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14'], 9),
    );
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe('high-rpe');
    expect(insights[0].tone).toBe('warning');
    expect(insights[0].action?.factor).toBe(0.9);
  });

  it('treats an average of exactly 8.5 as high', () => {
    const { insights } = build([NEXT_WEEK_RUN], ratedLogs(['2026-03-13'], 9).concat(ratedLogs(['2026-03-14'], 8)));
    expect(insights[0].id).toBe('high-rpe');
  });

  it('holds the next week when RPE drifts between 7.5 and 8.4', () => {
    const { insights } = build([NEXT_WEEK_RUN], ratedLogs(['2026-03-12', '2026-03-13', '2026-03-14'], 8));
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe('rpe-drift');
    expect(insights[0].tone).toBe('neutral');
    expect(insights[0].action?.factor).toBe(1);
  });

  it('does not hold without at least three rated logs', () => {
    expect(build([NEXT_WEEK_RUN], ratedLogs(['2026-03-13', '2026-03-14'], 8)).insights).toEqual([]);
  });

  it('notes a missed long run without compensation', () => {
    const { insights } = build([
      workout({ workout_date: '2026-03-09', type: 'LONG', distance_km: 14, status: 'SKIPPED' }),
      NEXT_WEEK_RUN,
    ]);
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe('long-run-missed');
    expect(insights[0].tone).toBe('neutral');
    expect(insights[0].action?.factor).toBe(1);
  });

  it('ignores a long run that was completed', () => {
    expect(
      build([workout({ workout_date: '2026-03-09', type: 'LONG', status: 'DONE' }), NEXT_WEEK_RUN]).insights,
    ).toEqual([]);
  });

  it('suggests a 10% bump when adherence is high and RPE is low', () => {
    const dates = ['2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12'];
    const workouts = dates.map((workout_date) => workout({ workout_date, status: 'DONE' })).concat(NEXT_WEEK_RUN);
    const { insights } = build(workouts, ratedLogs(dates, 5));
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe('ready-to-build');
    expect(insights[0].tone).toBe('positive');
    expect(insights[0].action).toEqual({ kind: 'scale-week', weekStart: TARGET_WEEK_START, factor: 1.1 });
  });

  it('does not bump below the adherence threshold or without rated logs', () => {
    const dates = ['2026-03-09', '2026-03-10', '2026-03-11'];
    const done = dates.map((workout_date) => workout({ workout_date, status: 'DONE' }));
    expect(
      build(done.concat(workout({ workout_date: '2026-03-12', status: 'SKIPPED' }), NEXT_WEEK_RUN), ratedLogs(dates, 5))
        .insights,
    ).toEqual([]);
    expect(build(done.concat(NEXT_WEEK_RUN), []).insights).toEqual([]);
  });

  it('strips actions during the race week and beyond the race date', () => {
    const missed = [
      workout({ workout_date: '2026-03-12', status: 'SKIPPED' }),
      workout({ workout_date: '2026-03-14', status: 'SKIPPED' }),
      NEXT_WEEK_RUN,
      workout({ workout_date: '2026-03-29', type: 'RACE', distance_km: 42.195 }),
    ];
    const raceWeek = build(missed);
    expect(raceWeek.insights[0].id).toBe('missed-runs');
    expect(raceWeek.insights[0].action).toBeUndefined();

    const pastRace = build(missed.slice(0, 3), [], '2026-03-20');
    expect(pastRace.insights[0].action).toBeUndefined();
  });

  it('requires a planned run in the target week for an action', () => {
    const { insights } = build([
      workout({ workout_date: '2026-03-12', status: 'SKIPPED' }),
      workout({ workout_date: '2026-03-14', status: 'SKIPPED' }),
      workout({ id: 'next-week-run', workout_date: TARGET_WEEK_START, distance_km: 8, status: 'DONE' }),
    ]);
    expect(insights[0].id).toBe('missed-runs');
    expect(insights[0].action).toBeUndefined();
  });

  it('clamps scale factors to the allowed range', () => {
    expect(clampScaleFactor(0.3)).toBe(0.6);
    expect(clampScaleFactor(1.3)).toBe(1.15);
    expect(clampScaleFactor(0.8)).toBe(0.8);
  });

  it('lets warnings suppress the positive bump and keeps the long-run note', () => {
    const windowDates = Array.from({ length: 14 }, (_, index) => `2026-03-${String(index + 2).padStart(2, '0')}`);
    const done = Array.from({ length: 18 }, (_, index) =>
      workout({ id: `done-${index}`, workout_date: windowDates[index % 14], status: 'DONE' }),
    );
    const skipped = [
      workout({ id: 'skip-1', workout_date: '2026-03-14', status: 'SKIPPED' }),
      workout({ id: 'skip-2', workout_date: '2026-03-15', status: 'SKIPPED' }),
      workout({ id: 'skip-long', workout_date: '2026-03-15', type: 'LONG', status: 'SKIPPED' }),
    ];
    const { insights } = build(done.concat(skipped, NEXT_WEEK_RUN), ratedLogs(windowDates.slice(0, 5), 5));
    expect(insights.map((insight) => insight.id)).toEqual(['missed-runs', 'long-run-missed']);
  });
});
