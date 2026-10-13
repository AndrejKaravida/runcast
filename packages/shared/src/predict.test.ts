import { describe, expect, it } from 'vitest';
import {
  detectPersonalBests,
  predictRaceTimes,
  riegelEquivalent,
  STANDARD_RACE_KM,
  vdotFromAnchor,
  vdotFromMarathonPace,
  vdotFromPlan,
} from './predict';
import { pacesFromVdot, vdotFromPerformance } from './vdot';

describe('predictRaceTimes', () => {
  it('round-trips standard distances within one second', () => {
    const cases = [
      [5, 1500],
      [10, 3000],
      [21.0975, 7200],
      [42.195, 13500],
      [5, 900],
    ] as const;
    for (const [distanceKm, timeSec] of cases) {
      const predictions = predictRaceTimes(vdotFromPerformance(distanceKm, timeSec), [distanceKm]);
      expect(predictions).not.toBeNull();
      expect(Math.abs(predictions![0].timeSec - timeSec)).toBeLessThanOrEqual(1);
    }
  });

  it('matches published Daniels tables for VDOT 50', () => {
    const predictions = predictRaceTimes(50)!;
    expect(Math.abs(predictions[0].timeSec - 1196)).toBeLessThanOrEqual(5);
    expect(Math.abs(predictions[1].timeSec - 2480)).toBeLessThanOrEqual(5);
    expect(Math.abs(predictions[2].timeSec - 5492)).toBeLessThanOrEqual(5);
    expect(Math.abs(predictions[3].timeSec - 11440)).toBeLessThanOrEqual(5);
  });

  it('slows pace strictly with distance', () => {
    const predictions = predictRaceTimes(45)!;
    for (let i = 1; i < predictions.length; i++) {
      expect(predictions[i].timeSec).toBeGreaterThan(predictions[i - 1].timeSec);
      expect(predictions[i].paceSecPerKm).toBeGreaterThan(predictions[i - 1].paceSecPerKm);
    }
  });

  it('faster VDOT yields faster predictions on every distance', () => {
    const faster = predictRaceTimes(50)!;
    const slower = predictRaceTimes(45)!;
    faster.forEach((prediction, index) => expect(prediction.timeSec).toBeLessThan(slower[index].timeSec));
  });

  it('rejects a non-finite VDOT and non-positive distance', () => {
    expect(() => predictRaceTimes(Number.NaN)).toThrow('vdot must be finite');
    expect(() => predictRaceTimes(45, [0])).toThrow('distance must be positive');
  });

  it('returns null instead of saturating when the VDOT is below the solvable range', () => {
    expect(predictRaceTimes(2)).toBeNull();
    expect(predictRaceTimes(10)).toBeNull();
    expect(predictRaceTimes(13, [5])).toBeNull();
    expect(predictRaceTimes(15, [21.0975])).toBeNull();
  });

  it('still solves shorter distances for a VDOT that cannot reach the marathon', () => {
    const predictions = predictRaceTimes(15, [5, 10]);
    expect(predictions).not.toBeNull();
    expect(predictions!.map((prediction) => prediction.distanceKm)).toEqual([5, 10]);
  });

  it('uses the four standard distances by default', () => {
    expect(predictRaceTimes(45)!.map((prediction) => prediction.distanceKm)).toEqual([...STANDARD_RACE_KM]);
  });
});

describe('riegelEquivalent', () => {
  it('is the identity for the same distance', () => {
    expect(riegelEquivalent(1500, 10, 10)).toBeCloseTo(1500, 6);
  });

  it('scales time by (d2/d1)^1.06', () => {
    expect(riegelEquivalent(600, 10, 20)).toBeCloseTo(600 * Math.pow(2, 1.06), 6);
    expect(riegelEquivalent(1500, 5, 10)).toBeCloseTo(3127.2, 0);
  });

  it('rejects non-positive inputs', () => {
    expect(() => riegelEquivalent(0, 5, 10)).toThrow('time and distances must be positive');
    expect(() => riegelEquivalent(1500, 0, 10)).toThrow('time and distances must be positive');
    expect(() => riegelEquivalent(1500, 5, 0)).toThrow('time and distances must be positive');
  });
});

function log(id: string, logDate: string, distanceKm: number | null, durationSec: number | null) {
  return { id, log_date: logDate, distance_km: distanceKm, duration_sec: durationSec };
}

describe('detectPersonalBests', () => {
  it('picks the fastest log inside the tolerance window', () => {
    const bests = detectPersonalBests([
      log('a', '2026-01-10', 5.01, 1530),
      log('b', '2026-02-10', 4.99, 1500),
      log('c', '2026-03-10', 4.5, 1400),
    ]);
    expect(bests).toEqual([{ distanceKm: 5, timeSec: 1500, logDate: '2026-02-10', logId: 'b' }]);
  });

  it('ignores logs outside ±0.4% and below 3 km', () => {
    const bests = detectPersonalBests([log('a', '2026-01-10', 5.03, 1400), log('b', '2026-01-11', 2.9, 700)]);
    expect(bests).toEqual([]);
  });

  it('rejects long-run distances that are not a half-marathon or marathon PB', () => {
    const bests = detectPersonalBests([log('a', '2026-01-10', 21.0, 5400), log('b', '2026-01-11', 41.5, 12000)]);
    expect(bests).toEqual([]);
  });

  it('accepts half-marathon and marathon logs rounded to two decimals', () => {
    const bests = detectPersonalBests([log('a', '2026-01-10', 21.1, 5400), log('b', '2026-01-11', 42.2, 12000)]);
    expect(bests.map((best) => [best.distanceKm, best.timeSec])).toEqual([
      [21.0975, 5400],
      [42.195, 12000],
    ]);
  });

  it('keeps a numeric(6,2) stored race distance within the 0.01 km card tolerance', () => {
    const quantize = (value: number): number => Math.round(value * 100) / 100;
    for (const [generated, stored] of [
      [42.195, 42.2],
      [21.0975, 21.1],
    ] as const) {
      expect(quantize(generated)).toBe(stored);
      expect(Math.abs(stored - generated)).toBeLessThan(0.01);
      const bests = detectPersonalBests([log('a', '2026-01-10', stored, 10000)]);
      expect(bests.map((best) => best.distanceKm)).toEqual([generated]);
    }
  });

  it('breaks ties by the most recent log', () => {
    const bests = detectPersonalBests([log('a', '2026-01-10', 5, 1500), log('b', '2026-02-10', 5, 1500)]);
    expect(bests[0].logId).toBe('b');
  });

  it('skips logs without distance or duration', () => {
    const bests = detectPersonalBests([
      log('a', '2026-01-10', null, 1500),
      log('b', '2026-01-11', 5, null),
      log('c', '2026-01-12', 5, 0),
    ]);
    expect(bests).toEqual([]);
  });

  it('detects separated standard distances and returns them in order', () => {
    const bests = detectPersonalBests([
      log('a', '2026-01-10', 10.01, 2640),
      log('b', '2026-01-11', 21.05, 6000),
      log('c', '2026-01-12', 42.2, 13000),
      log('d', '2026-01-13', 10, 2600),
    ]);
    expect(bests.map((best) => [best.distanceKm, best.timeSec])).toEqual([
      [10, 2600],
      [21.0975, 6000],
      [42.195, 13000],
    ]);
  });

  it('assigns a log to at most one distance', () => {
    const bests = detectPersonalBests([log('a', '2026-01-10', 10.01, 2640)]);
    expect(bests).toHaveLength(1);
  });
});

describe('vdotFromPlan', () => {
  const anchor = { kind: 'goal', distanceKm: 42.195, timeSec: 13500 } as const;

  it('prefers plan paces over the anchor', () => {
    const paces = pacesFromVdot(45);
    expect(vdotFromPlan({ paces, anchor })).toBeCloseTo(vdotFromMarathonPace(paces.marathonSecPerKm), 10);
  });

  it('falls back to the anchor without paces', () => {
    expect(vdotFromPlan({ paces: null, anchor })).toBeCloseTo(vdotFromAnchor(anchor), 10);
  });

  it('returns null for a base plan', () => {
    expect(vdotFromPlan({ paces: null, anchor: null })).toBeNull();
  });

  it('keeps the marathon-pace inversion within a few percent of the anchor VDOT', () => {
    for (const vdot of [30, 40, 50, 60]) {
      const recovered = vdotFromMarathonPace(pacesFromVdot(vdot).marathonSecPerKm);
      expect(Math.abs(recovered - vdot) / vdot).toBeLessThan(0.03);
    }
  });

  it('predicts exactly the marathon pace time from the inverted VDOT', () => {
    const paces = pacesFromVdot(50);
    const vdot = vdotFromPlan({ paces, anchor: null });
    expect(vdot).not.toBeNull();
    const marathon = predictRaceTimes(vdot as number, [42.195])![0];
    expect(Math.abs(marathon.timeSec - paces.marathonSecPerKm * 42.195)).toBeLessThanOrEqual(1);
  });
});
