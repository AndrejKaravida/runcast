import { describe, expect, it } from 'vitest';
import { buildFuelingPlan, hydrationForTemp } from './fueling';

const MIN = 60;

describe('buildFuelingPlan', () => {
  it('vraća null za tipove bez plana goriva', () => {
    expect(buildFuelingPlan({ type: 'EASY', durationSec: 60 * MIN })).toBeNull();
    expect(buildFuelingPlan({ type: 'INTERVALS', durationSec: 60 * MIN })).toBeNull();
    expect(buildFuelingPlan({ type: 'REPETITIONS', durationSec: 60 * MIN })).toBeNull();
    expect(buildFuelingPlan({ type: 'STRENGTH', durationSec: 60 * MIN })).toBeNull();
    expect(buildFuelingPlan({ type: 'REST', durationSec: 0 })).toBeNull();
  });

  it('TEMPO dobija plan samo od 75 min', () => {
    expect(buildFuelingPlan({ type: 'TEMPO', durationSec: 74 * MIN })).toBeNull();
    expect(buildFuelingPlan({ type: 'TEMPO', durationSec: 75 * MIN })).not.toBeNull();
  });

  it('LONG 100 min: gelovi na 40 i 75 min, bez gela u zadnjih 10 min', () => {
    const plan = buildFuelingPlan({ type: 'LONG', durationSec: 100 * MIN });
    expect(plan?.during.map((cue) => cue.atSec)).toEqual([40 * MIN, 75 * MIN]);
    expect(plan?.during[0]?.text).toEqual({ key: 'content:fueling.during.gel', params: { index: 1 } });
    expect(plan?.during[1]?.text).toEqual({ key: 'content:fueling.during.gel', params: { index: 2 } });
  });

  it('kratak LONG nema gelove ali ima pre i posle', () => {
    const plan = buildFuelingPlan({ type: 'LONG', durationSec: 60 * MIN });
    expect(plan?.during).toEqual([]);
    expect(plan?.pre.length).toBeGreaterThanOrEqual(3);
    expect(plan?.post.map((line) => line.key)).toEqual([
      'content:fueling.post.recovery',
      'content:fueling.post.rehydrate',
    ]);
  });

  it('užina se bira po trajanju', () => {
    const long = buildFuelingPlan({ type: 'LONG', durationSec: 100 * MIN });
    const medium = buildFuelingPlan({ type: 'LONG', durationSec: 70 * MIN });
    const short = buildFuelingPlan({ type: 'LONG', durationSec: 45 * MIN });
    expect(long?.pre[1]?.key).toBe('content:fueling.pre.snackLong');
    expect(medium?.pre[1]?.key).toBe('content:fueling.pre.snackMedium');
    expect(short?.pre[1]?.key).toBe('content:fueling.pre.snackShort');
  });

  it('trajanje izvodi iz distance i tempa kada nema durationSec', () => {
    const plan = buildFuelingPlan({ type: 'LONG', durationSec: 0, distanceKm: 24, paceSecPerKm: 330 });
    expect(plan?.during.map((cue) => cue.atSec)).toEqual([40 * MIN, 75 * MIN, 110 * MIN]);
  });

  it('RACE dodaje liniju o probi gelova', () => {
    const plan = buildFuelingPlan({ type: 'RACE', durationSec: 180 * MIN });
    expect(plan?.pre.some((line) => line.key === 'content:fueling.pre.race')).toBe(true);
    expect(plan?.during.length).toBeGreaterThan(0);
  });

  it('bez trajanja nema plana', () => {
    expect(buildFuelingPlan({ type: 'LONG', durationSec: 0 })).toBeNull();
    expect(buildFuelingPlan({ type: 'RACE', durationSec: 0, distanceKm: 0, paceSecPerKm: 0 })).toBeNull();
  });
});

describe('hydrationForTemp', () => {
  it('vraća ključ pojasa za svaku temperaturu', () => {
    expect(hydrationForTemp(3)).toBe('content:fueling.hydration.cold');
    expect(hydrationForTemp(10)).toBe('content:fueling.hydration.cool');
    expect(hydrationForTemp(20)).toBe('content:fueling.hydration.warm');
    expect(hydrationForTemp(28)).toBe('content:fueling.hydration.hot');
  });

  it('bez temperature daje podrazumevani pojas', () => {
    expect(hydrationForTemp(null)).toBe('content:fueling.hydration.default');
    expect(hydrationForTemp(undefined)).toBe('content:fueling.hydration.default');
  });
});
