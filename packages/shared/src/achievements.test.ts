import { describe, expect, it } from 'vitest';
import {
  computeAchievements,
  weeklyChallenge,
  type Achievement,
  type AchievementLog,
  type AchievementWorkout,
} from './achievements';

const TODAY = '2026-03-16';

let sequence = 0;

function workout(
  overrides: Partial<AchievementWorkout> & Pick<AchievementWorkout, 'workout_date'>,
): AchievementWorkout {
  sequence += 1;
  return {
    id: `w-${sequence}`,
    type: 'EASY',
    status: 'DONE',
    distance_km: 5,
    ...overrides,
  };
}

function log(overrides: Partial<AchievementLog> & Pick<AchievementLog, 'log_date'>): AchievementLog {
  return { workout_id: null, distance_km: 5, duration_sec: 1800, ...overrides };
}

function compute(workouts: AchievementWorkout[], logs: AchievementLog[] = [], today = TODAY): Achievement[] {
  return computeAchievements({ workouts, logs, profile: null, today });
}

function find(achievements: Achievement[], id: string): Achievement {
  const achievement = achievements.find((entry) => entry.id === id);
  if (!achievement) throw new Error(`missing achievement ${id}`);
  return achievement;
}

function dates(count: number, from: string): string[] {
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  return Array.from({ length: count }, (_, index) => new Date(start + index * 86_400_000).toISOString().slice(0, 10));
}

describe('computeAchievements', () => {
  it('starts locked with LocalizedText keys and no Serbian literals', () => {
    const achievements = compute([]);
    expect(achievements).toHaveLength(20);
    expect(find(achievements, 'first.1')).toMatchObject({
      family: 'first',
      tier: 2,
      unlockedAt: null,
      progress: { current: 0, target: 1 },
      title: { key: 'content:achievements.first.title' },
      description: { key: 'content:achievements.first.description' },
    });
    expect(find(achievements, 'sessions.10').title).toEqual({
      key: 'content:achievements.sessions.title',
      params: { count: 10 },
    });
  });

  it('unlocks first and session levels at the N-th done run date', () => {
    const days = dates(6, '2026-03-01');
    const achievements = compute(days.map((workout_date) => workout({ workout_date })));
    expect(find(achievements, 'first.1').unlockedAt).toBe('2026-03-01');
    expect(find(achievements, 'sessions.5').unlockedAt).toBe('2026-03-05');
    expect(find(achievements, 'sessions.10').unlockedAt).toBeNull();
    expect(find(achievements, 'sessions.10').progress).toEqual({ current: 6, target: 10 });
  });

  it('ignores future dates, non-done statuses and non-run types', () => {
    const achievements = compute([
      workout({ workout_date: '2026-03-17' }),
      workout({ workout_date: '2026-03-10', status: 'PLANNED' }),
      workout({ workout_date: '2026-03-10', status: 'SKIPPED' }),
      workout({ workout_date: '2026-03-10', type: 'REST' }),
      workout({ workout_date: '2026-03-10', type: 'STRENGTH' }),
    ]);
    expect(find(achievements, 'first.1').unlockedAt).toBeNull();
    expect(find(achievements, 'strength.10').unlockedAt).toBeNull();
  });

  it('ignores the profile in v1 rules', () => {
    const workouts = [workout({ workout_date: '2026-03-10' })];
    const withNull = computeAchievements({ workouts, logs: [], profile: null, today: TODAY });
    const withProfile = computeAchievements({
      workouts,
      logs: [],
      profile: { experience: 'first', volume_band: 'lt20' },
      today: TODAY,
    });
    expect(withProfile).toEqual(withNull);
  });

  it('counts four consecutive weeks, including the current week when it has a run', () => {
    const weeks = ['2026-02-23', '2026-03-02', '2026-03-09', '2026-03-16'];
    const achievements = compute(weeks.map((workout_date) => workout({ workout_date })));
    expect(find(achievements, 'streakWeeks.4')).toMatchObject({
      unlockedAt: '2026-02-23',
      progress: { current: 4, target: 4 },
    });
    expect(find(achievements, 'streakWeeks.8').unlockedAt).toBeNull();
  });

  it('lets a plain current week join the streak backwards', () => {
    const weeks = ['2026-02-16', '2026-02-23', '2026-03-02', '2026-03-09'];
    const achievements = compute(weeks.map((workout_date) => workout({ workout_date })));
    expect(find(achievements, 'streakWeeks.4').unlockedAt).toBe('2026-02-16');
  });

  it('does not unlock four weeks from three and breaks on a gap week', () => {
    const short = compute(['2026-02-23', '2026-03-02', '2026-03-09'].map((workout_date) => workout({ workout_date })));
    expect(find(short, 'streakWeeks.4').unlockedAt).toBeNull();
    expect(find(short, 'streakWeeks.4').progress).toEqual({ current: 3, target: 4 });

    const gapped = compute(
      ['2026-02-02', '2026-02-09', '2026-02-16', '2026-03-09'].map((workout_date) => workout({ workout_date })),
    );
    expect(find(gapped, 'streakWeeks.4').unlockedAt).toBeNull();
    expect(find(gapped, 'streakWeeks.4').progress).toEqual({ current: 1, target: 4 });
  });

  it('uses the linked log distance and date for the long family', () => {
    const workouts = [workout({ id: 'long-1', workout_date: '2026-03-10', type: 'LONG', distance_km: 8 })];
    const logs = [log({ workout_id: 'long-1', log_date: '2026-03-11', distance_km: 12 })];
    const achievements = compute(workouts, logs);
    expect(find(achievements, 'long.10').unlockedAt).toBe('2026-03-11');
    expect(find(achievements, 'long.15')).toMatchObject({ unlockedAt: null, progress: { current: 12, target: 15 } });
  });

  it('falls back to the planned long distance without a log', () => {
    const achievements = compute([
      workout({ id: 'long-2', workout_date: '2026-03-10', type: 'LONG', distance_km: 20 }),
    ]);
    expect(find(achievements, 'long.20').unlockedAt).toBe('2026-03-10');
    expect(find(achievements, 'long.30').unlockedAt).toBeNull();
  });

  it('unlocks kilometre levels at the log crossing each threshold', () => {
    const achievements = compute(
      [],
      [
        log({ log_date: '2026-03-01', distance_km: 40 }),
        log({ log_date: '2026-03-05', distance_km: 45 }),
        log({ log_date: '2026-03-08', distance_km: 20 }),
      ],
    );
    expect(find(achievements, 'km.100').unlockedAt).toBe('2026-03-08');
    expect(find(achievements, 'km.250').unlockedAt).toBeNull();
    expect(find(achievements, 'km.250').progress).toEqual({ current: 105, target: 250 });
  });

  it('crosses several kilometre thresholds on one log and ignores future or null logs', () => {
    const achievements = compute(
      [],
      [
        log({ log_date: '2026-03-02', distance_km: 600 }),
        log({ log_date: '2026-03-18', distance_km: 500 }),
        log({ log_date: '2026-03-03', distance_km: null }),
      ],
    );
    expect(find(achievements, 'km.100').unlockedAt).toBe('2026-03-02');
    expect(find(achievements, 'km.250').unlockedAt).toBe('2026-03-02');
    expect(find(achievements, 'km.500').unlockedAt).toBe('2026-03-02');
    expect(find(achievements, 'km.1000').unlockedAt).toBeNull();
    expect(find(achievements, 'km.1000').progress).toEqual({ current: 600, target: 1000 });
  });

  it('unlocks tempo, race and strength by type counts', () => {
    const strengthDays = dates(10, '2026-03-01');
    const achievements = compute([
      workout({ workout_date: '2026-03-01', type: 'TEMPO' }),
      workout({ workout_date: '2026-03-02', type: 'RACE' }),
      ...strengthDays.map((workout_date) => workout({ workout_date, type: 'STRENGTH', distance_km: 0 })),
    ]);
    expect(find(achievements, 'tempo.1').unlockedAt).toBe('2026-03-01');
    expect(find(achievements, 'race.1').unlockedAt).toBe('2026-03-02');
    expect(find(achievements, 'strength.10').unlockedAt).toBe('2026-03-10');
  });

  it('unlocks a personal best only when a later log beats the earlier one', () => {
    const single = compute([], [log({ log_date: '2026-03-01', distance_km: 10, duration_sec: 3000 })]);
    expect(find(single, 'pb.1').unlockedAt).toBeNull();

    const improved = compute(
      [],
      [
        log({ log_date: '2026-03-01', distance_km: 10, duration_sec: 3000 }),
        log({ log_date: '2026-03-05', distance_km: 10, duration_sec: 2880 }),
      ],
    );
    expect(find(improved, 'pb.1').unlockedAt).toBe('2026-03-05');

    const slower = compute(
      [],
      [
        log({ log_date: '2026-03-01', distance_km: 10, duration_sec: 3000 }),
        log({ log_date: '2026-03-05', distance_km: 10, duration_sec: 3100 }),
      ],
    );
    expect(find(slower, 'pb.1').unlockedAt).toBeNull();
  });
});

describe('weeklyChallenge', () => {
  const plan = { start_date: '2026-03-01', race_date: '2026-05-31' };

  it('returns null outside the plan window', () => {
    expect(weeklyChallenge(plan, [], '2026-02-28')).toBeNull();
    expect(weeklyChallenge(plan, [], '2026-06-01')).toBeNull();
  });

  it('reports done/target and the long run state', () => {
    const workouts = [
      workout({ workout_date: '2026-03-09' }),
      workout({ workout_date: '2026-03-10', type: 'TEMPO', status: 'PLANNED' }),
      workout({ workout_date: '2026-03-11', type: 'EASY', status: 'PLANNED' }),
      workout({ workout_date: '2026-03-12', type: 'LONG', status: 'PLANNED' }),
      workout({ workout_date: '2026-03-11', type: 'STRENGTH', status: 'DONE', distance_km: 0 }),
    ];
    const challenge = weeklyChallenge(plan, workouts, '2026-03-12');
    expect(challenge).toMatchObject({
      weekStart: '2026-03-09',
      done: 1,
      target: 4,
      longPlanned: true,
      longDone: false,
      complete: false,
      sessionsText: { key: 'content:achievements.challenge.sessions', params: { done: 1, target: 4 } },
      longText: { key: 'content:achievements.challenge.longPlanned' },
    });
  });

  it('completes when every planned run is done and marks the long run done', () => {
    const workouts = [
      workout({ workout_date: '2026-03-10', type: 'EASY' }),
      workout({ workout_date: '2026-03-12', type: 'LONG' }),
    ];
    const challenge = weeklyChallenge(plan, workouts, '2026-03-12');
    expect(challenge).toMatchObject({
      done: 2,
      target: 2,
      longDone: true,
      complete: true,
      longText: { key: 'content:achievements.challenge.longDone' },
    });
  });

  it('returns null for an in-plan week without planned runs', () => {
    expect(weeklyChallenge(plan, [], '2026-03-12')).toBeNull();
    expect(
      weeklyChallenge(plan, [workout({ workout_date: '2026-03-11', type: 'STRENGTH', distance_km: 0 })], '2026-03-12'),
    ).toBeNull();
  });
});
