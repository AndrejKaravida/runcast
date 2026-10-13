import { describe, expect, it } from 'vitest';
import {
  haversineMeters,
  initialLiveTrack,
  isFixUsable,
  isGpsLost,
  reduceLiveTrack,
  resetLiveTrackAnchor,
  shouldAutoPause,
  shouldAutoResume,
  LIVE_MAX_ACCURACY_M,
  LIVE_MAX_FIX_AGE_MS,
  LIVE_MIN_PACE_SEC_PER_KM,
  LIVE_PAUSE_HOLD_MS,
  type LiveTrackState,
  type TrackFix,
} from './live-track';

const BASE_MS = 1700000000000;
const METERS_PER_DEG_LAT = 111194.92664455873;
const LAT = 45.2517;
const LON = 19.8369;

function fix(index: number, overrides: Partial<TrackFix> = {}): TrackFix {
  return {
    latitude: LAT + (index * 10) / METERS_PER_DEG_LAT,
    longitude: LON,
    accuracyM: 5,
    timestampMs: BASE_MS + index * 3000,
    ...overrides,
  };
}

function walk(count: number, insert: (state: LiveTrackState, index: number) => LiveTrackState | void): LiveTrackState {
  let state = initialLiveTrack();
  for (let index = 0; index <= count; index += 1) {
    const next = insert(state, index);
    if (next) {
      state = next;
      continue;
    }
    state = reduceLiveTrack(state, fix(index), fix(index).timestampMs);
  }
  return state;
}

describe('live track', () => {
  it('measures haversine steps in meters', () => {
    expect(haversineMeters(fix(0), fix(1))).toBeCloseTo(10, 6);
    expect(haversineMeters({ latitude: LAT, longitude: LON }, { latitude: LAT, longitude: LON })).toBe(0);
  });

  it('rejects inaccurate and stale fixes', () => {
    expect(isFixUsable(fix(0, { accuracyM: LIVE_MAX_ACCURACY_M }), BASE_MS)).toBe(true);
    expect(isFixUsable(fix(0, { accuracyM: LIVE_MAX_ACCURACY_M + 1 }), BASE_MS)).toBe(false);
    expect(isFixUsable(fix(0), BASE_MS + LIVE_MAX_FIX_AGE_MS)).toBe(true);
    expect(isFixUsable(fix(0), BASE_MS + LIVE_MAX_FIX_AGE_MS + 1)).toBe(false);
    expect(isFixUsable(fix(0), BASE_MS - 1000)).toBe(true);
  });

  it('ignores teleport jumps and stationary drift', () => {
    const anchored = reduceLiveTrack(initialLiveTrack(), fix(0), BASE_MS);
    const teleport = reduceLiveTrack(
      anchored,
      fix(0, { latitude: LAT + 0.01, timestampMs: BASE_MS + 1000 }),
      BASE_MS + 1000,
    );
    expect(teleport.distanceM).toBe(0);
    const drift = reduceLiveTrack(
      anchored,
      fix(0, { latitude: LAT + 1 / METERS_PER_DEG_LAT, timestampMs: BASE_MS + 3000 }),
      BASE_MS + 3000,
    );
    expect(drift.distanceM).toBe(0);
  });

  it('accumulates distance, moving time, split pace and EMA at constant speed', () => {
    const state = walk(110, () => {});
    expect(state.distanceM).toBeCloseTo(1100, 3);
    expect(state.movingMs).toBe(330000);
    expect(state.splits).toHaveLength(1);
    expect(state.splits[0]).toEqual({ km: 1, paceSecPerKm: 300 });
    expect(state.paceEmaSecPerKm).not.toBeNull();
    expect(state.paceEmaSecPerKm as number).toBeCloseTo(300, 1);
    expect(state.speedMps).toBeCloseTo(10 / 3, 6);
  });

  it('bounds the instant pace that feeds the EMA', () => {
    let state = walk(10, () => {});
    const emaBefore = state.paceEmaSecPerKm as number;
    const burst = fix(30, { timestampMs: BASE_MS + 50000 });
    state = reduceLiveTrack(state, burst, burst.timestampMs);
    const emaAfter = state.paceEmaSecPerKm as number;
    expect(emaAfter).toBeLessThan(emaBefore);
    expect(emaAfter).toBeGreaterThanOrEqual(LIVE_MIN_PACE_SEC_PER_KM);
  });

  it('excludes pause gaps and drift via anchor reset', () => {
    const running = walk(50, () => {});
    const paused = resetLiveTrackAnchor(running, fix(50));
    const farJump = reduceLiveTrack(
      paused,
      fix(50, { latitude: LAT + 500 / METERS_PER_DEG_LAT, timestampMs: BASE_MS + 153000 }),
      BASE_MS + 153000,
    );
    expect(farJump.distanceM).toBe(running.distanceM);
    const resumed = resetLiveTrackAnchor(paused, fix(51));
    const next = reduceLiveTrack(resumed, fix(52), fix(52).timestampMs);
    expect(next.distanceM).toBeCloseTo(running.distanceM + 10, 3);
    expect(next.movingMs).toBe(running.movingMs + 3000);
  });

  it('hysteresis helpers gate auto pause and resume', () => {
    expect(isGpsLost(null, BASE_MS)).toBe(false);
    expect(isGpsLost(BASE_MS, BASE_MS + 4999)).toBe(false);
    expect(isGpsLost(BASE_MS, BASE_MS + 5001)).toBe(true);
    expect(shouldAutoPause(BASE_MS, BASE_MS + LIVE_PAUSE_HOLD_MS - 1)).toBe(false);
    expect(shouldAutoPause(BASE_MS, BASE_MS + LIVE_PAUSE_HOLD_MS)).toBe(true);
    expect(shouldAutoResume(2.9, 2)).toBe(false);
    expect(shouldAutoResume(3, 0.5)).toBe(false);
    expect(shouldAutoResume(3.1, 0.6)).toBe(true);
  });
});
