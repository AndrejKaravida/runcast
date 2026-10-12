import { describe, expect, it } from 'vitest';
import { buildPacePlan, raceChecklist, raceWeatherNote, type RaceStrategy } from './raceday';
import type { WeatherAssessment } from './weather-rules';

const DISTANCES = [5, 10, 21.0975, 42.195] as const;
const GOAL_TIME_SEC = 13500;

describe('buildPacePlan', () => {
  it('suma kumulativa je tačno ciljno vreme za sve distance i strategije', () => {
    for (const distanceKm of DISTANCES) {
      for (const strategy of ['even', 'negative'] as const) {
        const splits = buildPacePlan(GOAL_TIME_SEC, distanceKm, strategy);
        expect(splits.at(-1)?.cumulativeSec).toBe(GOAL_TIME_SEC);
        for (const split of splits) {
          expect(split.segmentSec).toBeGreaterThan(0);
          expect(split.paceSecPerKm).toBeGreaterThan(0);
          expect(split.label.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('deli distancu na očekivani broj deonica', () => {
    expect(buildPacePlan(GOAL_TIME_SEC, 5, 'even')).toHaveLength(5);
    expect(buildPacePlan(GOAL_TIME_SEC, 10, 'even')).toHaveLength(2);
    expect(buildPacePlan(GOAL_TIME_SEC, 21.0975, 'even')).toHaveLength(5);
    const marathon = buildPacePlan(GOAL_TIME_SEC, 42.195, 'even');
    expect(marathon).toHaveLength(9);
    expect(marathon.at(-1)?.distanceKm).toBeCloseTo(2.195, 2);
  });

  it('negativni split: prva deonica sporija, zadnja brža od ravnomernog', () => {
    const even = buildPacePlan(GOAL_TIME_SEC, 42.195, 'even');
    const negative = buildPacePlan(GOAL_TIME_SEC, 42.195, 'negative');
    expect(negative[0].paceSecPerKm).toBeGreaterThan(even[0].paceSecPerKm);
    expect(negative.at(-1)?.paceSecPerKm).toBeLessThan(even.at(-1)?.paceSecPerKm ?? 0);
  });

  it('odbija neispravne ulaze', () => {
    expect(() => buildPacePlan(0, 42.195, 'even')).toThrow();
    expect(() => buildPacePlan(Number.NaN, 42.195, 'even')).toThrow();
    expect(() => buildPacePlan(GOAL_TIME_SEC, -5, 'even')).toThrow();
    expect(() => buildPacePlan(GOAL_TIME_SEC, 42.195, 'tempo' as unknown as RaceStrategy)).toThrow();
  });
});

describe('raceChecklist', () => {
  it('id-jevi su unikatni i redosled stabilan', () => {
    const items = raceChecklist(42.195);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(raceChecklist(42.195)).toEqual(items);
  });

  it('duga trka je nadskup kratke po grupama', () => {
    const short = raceChecklist(5);
    const long = raceChecklist(21.0975);
    for (const group of ['dan_pre', 'jutro', 'staza'] as const) {
      const longIds = new Set(long.filter((item) => item.group === group).map((item) => item.id));
      for (const item of short.filter((entry) => entry.group === group)) {
        expect(longIds.has(item.id)).toBe(true);
      }
    }
    expect(long.some((item) => item.id === 'gel-plan')).toBe(true);
    expect(short.some((item) => item.id === 'gel-plan')).toBe(false);
  });
});

describe('raceWeatherNote', () => {
  it('vraća savet za svaki vremenski kod', () => {
    for (const code of ['STORM', 'RAIN', 'HEAT', 'COLD', 'WIND', 'AIR'] as const) {
      const assessment = { code, severity: 'warn', suggestion: 'keep', details: {} } as WeatherAssessment;
      expect(raceWeatherNote(assessment)).toBeTruthy();
    }
  });

  it('bez koda nema saveta', () => {
    expect(raceWeatherNote({ code: null, severity: 'none', suggestion: 'keep', details: {} })).toBeNull();
  });
});
