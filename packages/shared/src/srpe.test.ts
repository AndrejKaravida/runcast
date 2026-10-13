import { describe, expect, it } from 'vitest';
import { loadInsight, sessionLoad, trainingLoad, type SrpeLog } from './srpe';

const TODAY = '2026-03-16';

function dayBefore(daysAgo: number): string {
  const date = new Date(Date.UTC(2026, 2, 16));
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function loadLogs(spec: Array<{ daysAgo: number; load: number }>): SrpeLog[] {
  return spec.map(({ daysAgo, load }) => ({ rpe: 1, log_date: dayBefore(daysAgo), duration_sec: load * 60 }));
}

function balanced(acuteLoad: number, oldLoad: number): SrpeLog[] {
  return loadLogs([
    { daysAgo: 1, load: acuteLoad },
    { daysAgo: 3, load: acuteLoad },
    { daysAgo: 5, load: acuteLoad },
    ...([8, 11, 14, 17, 20, 23, 25, 27] as const).map((daysAgo) => ({ daysAgo, load: oldLoad })),
  ]);
}

describe('sessionLoad', () => {
  it('is RPE times minutes rounded to one decimal', () => {
    expect(sessionLoad(7, 730)).toBe(85.2);
    expect(sessionLoad(5, 1800)).toBe(150);
    expect(sessionLoad(1, 1)).toBe(0);
  });
});

describe('trainingLoad', () => {
  it('returns 8 weeks of day entries and zeroes without logs', () => {
    const load = trainingLoad([], TODAY);
    expect(load.days).toHaveLength(56);
    expect(load.days[0].date).toBe(dayBefore(55));
    expect(load.days[55].date).toBe(TODAY);
    expect(load.days.every((day) => day.load === 0)).toBe(true);
    expect(load.acute7).toBe(0);
    expect(load.chronic28Weekly).toBe(0);
    expect(load.acwr).toBe(0);
    expect(load.band).toBe('insufficient');
    expect(load.sessions28).toBe(0);
  });

  it('aggregates same-day logs and ignores missing, future and stale entries', () => {
    const load = trainingLoad(
      [
        { rpe: 1, log_date: dayBefore(3), duration_sec: 6000 },
        { rpe: 1, log_date: dayBefore(3), duration_sec: 3000 },
        { rpe: null, log_date: dayBefore(2), duration_sec: 3600 },
        { rpe: 5, log_date: dayBefore(2), duration_sec: null },
        { rpe: 5, log_date: dayBefore(2) },
        { rpe: 5, log_date: dayBefore(-1), duration_sec: 3600 },
        { rpe: 5, log_date: dayBefore(60), duration_sec: 3600 },
      ],
      TODAY,
    );
    expect(load.days[52]).toEqual({ date: dayBefore(3), load: 150 });
    expect(load.acute7).toBe(150);
    expect(load.sessions28).toBe(2);
  });

  it('splits acute (sum of last 7 days) from chronic (28 days / 4)', () => {
    const load = trainingLoad(
      loadLogs([
        { daysAgo: 6, load: 200 },
        { daysAgo: 7, load: 400 },
      ]),
      TODAY,
    );
    expect(load.acute7).toBe(200);
    expect(load.chronic28Weekly).toBe(150);
    expect(load.acwr).toBe(1.3);
  });

  it('stays insufficient below 8 sessions in 28 days even with a high ratio', () => {
    const load = trainingLoad(loadLogs([1, 2, 3, 4, 5, 6, 7].map((daysAgo) => ({ daysAgo, load: 100 }))), TODAY);
    expect(load.sessions28).toBe(7);
    expect(load.band).toBe('insufficient');
  });

  it('stays insufficient below 3 sessions in the last 7 days', () => {
    const load = trainingLoad(balanced(0, 100), TODAY);
    expect(load.sessions28).toBe(8);
    expect(load.band).toBe('insufficient');
  });

  it('bands 0.4 as low and 1.1 as sweet', () => {
    expect(trainingLoad(balanced(50, 150), TODAY)).toMatchObject({ acwr: 0.4, band: 'low' });
    expect(trainingLoad(balanced(100, 100), TODAY)).toMatchObject({ acwr: 1.1, band: 'sweet' });
  });

  it('bands exactly 0.8 and 1.3 as sweet, exactly 1.5 as caution', () => {
    expect(trainingLoad(balanced(40, 60), TODAY)).toMatchObject({ acwr: 0.8, band: 'sweet' });
    expect(trainingLoad(balanced(104, 81), TODAY)).toMatchObject({ acwr: 1.3, band: 'sweet' });
    expect(trainingLoad(balanced(80, 50), TODAY)).toMatchObject({ acwr: 1.5, band: 'caution' });
  });

  it('bands 1.4 as caution and 1.7 as high', () => {
    expect(trainingLoad(balanced(100, 70), TODAY)).toMatchObject({ acwr: 1.4, band: 'caution' });
    expect(trainingLoad(balanced(100, 50), TODAY)).toMatchObject({ acwr: 1.7, band: 'high' });
  });
});

describe('loadInsight', () => {
  it('returns null unless the band is caution or high', () => {
    for (const load of [
      trainingLoad([], TODAY),
      trainingLoad(balanced(50, 150), TODAY),
      trainingLoad(balanced(100, 100), TODAY),
    ]) {
      expect(loadInsight(load)).toBeNull();
    }
  });

  it('builds a warning insight with a 0.9 scale hint for caution', () => {
    const insight = loadInsight(trainingLoad(balanced(100, 70), TODAY));
    expect(insight).toEqual({
      id: 'load-caution',
      tone: 'warning',
      titleKey: 'content:srpe.caution.title',
      titleParams: { acwr: 1.4 },
      descriptionKey: 'content:srpe.caution.description',
      actionLabelKey: 'stats:coach.actions.loadCaution',
      factor: 0.9,
    });
  });

  it('builds a warning insight with a 0.8 scale hint for high', () => {
    const insight = loadInsight(trainingLoad(balanced(100, 50), TODAY));
    expect(insight).toMatchObject({
      id: 'load-high',
      tone: 'warning',
      titleKey: 'content:srpe.high.title',
      descriptionKey: 'content:srpe.high.description',
      actionLabelKey: 'stats:coach.actions.loadHigh',
      factor: 0.8,
    });
  });
});
