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
    expect(plan?.during[0]?.text).toContain('Gel 1');
    expect(plan?.during[1]?.text).toContain('Gel 2');
  });

  it('kratak LONG nema gelove ali ima pre i posle', () => {
    const plan = buildFuelingPlan({ type: 'LONG', durationSec: 60 * MIN });
    expect(plan?.during).toEqual([]);
    expect(plan?.pre.length).toBeGreaterThanOrEqual(3);
    expect(plan?.post.length).toBeGreaterThanOrEqual(1);
  });

  it('trajanje izvodi iz distance i tempa kada nema durationSec', () => {
    const plan = buildFuelingPlan({ type: 'LONG', durationSec: 0, distanceKm: 24, paceSecPerKm: 330 });
    expect(plan?.during.map((cue) => cue.atSec)).toEqual([40 * MIN, 75 * MIN, 110 * MIN]);
  });

  it('RACE dodaje liniju o probi gelova', () => {
    const plan = buildFuelingPlan({ type: 'RACE', durationSec: 180 * MIN });
    expect(plan?.pre.some((line) => line.includes('probaj'))).toBe(true);
    expect(plan?.during.length).toBeGreaterThan(0);
  });

  it('bez trajanja nema plana', () => {
    expect(buildFuelingPlan({ type: 'LONG', durationSec: 0 })).toBeNull();
    expect(buildFuelingPlan({ type: 'RACE', durationSec: 0, distanceKm: 0, paceSecPerKm: 0 })).toBeNull();
  });
});

describe('hydrationForTemp', () => {
  it('vraća pojas za svaku temperaturu', () => {
    expect(hydrationForTemp(3)).toContain('400–500');
    expect(hydrationForTemp(10)).toContain('500–600');
    expect(hydrationForTemp(20)).toContain('600–700');
    expect(hydrationForTemp(28)).toContain('700–800');
  });

  it('bez temperature daje opseg bez brojanja unosa', () => {
    expect(hydrationForTemp(null)).toContain('400–800');
    expect(hydrationForTemp(undefined)).toContain('400–800');
  });
});
