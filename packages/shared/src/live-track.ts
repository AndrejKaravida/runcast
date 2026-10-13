export interface TrackFix {
  latitude: number;
  longitude: number;
  accuracyM: number;
  timestampMs: number;
}

export interface LiveSplit {
  km: number;
  paceSecPerKm: number;
}

export interface LiveTrackState {
  distanceM: number;
  movingMs: number;
  splits: LiveSplit[];
  paceEmaSecPerKm: number | null;
  speedMps: number;
  lastAccepted: TrackFix | null;
  kmStartMovingMs: number;
}

export const LIVE_MAX_ACCURACY_M = 50;
export const LIVE_MAX_FIX_AGE_MS = 5000;
export const LIVE_LOST_AFTER_MS = 5000;
export const LIVE_MAX_SPEED_MPS = 12;
export const LIVE_PAUSE_SPEED_MPS = 0.6;
export const LIVE_PAUSE_HOLD_MS = 5000;
export const LIVE_RESUME_MOVE_M = 3;
export const LIVE_PACE_EMA_TAU_SEC = 17;
export const LIVE_MIN_EMA_STEP_M = 2;
export const LIVE_MIN_PACE_SEC_PER_KM = 90;
export const LIVE_MAX_PACE_SEC_PER_KM = 1800;

const EARTH_RADIUS_M = 6371000;

export function initialLiveTrack(): LiveTrackState {
  return {
    distanceM: 0,
    movingMs: 0,
    splits: [],
    paceEmaSecPerKm: null,
    speedMps: 0,
    lastAccepted: null,
    kmStartMovingMs: 0,
  };
}

export function haversineMeters(
  from: Pick<TrackFix, 'latitude' | 'longitude'>,
  to: Pick<TrackFix, 'latitude' | 'longitude'>,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(h));
}

export function isFixUsable(fix: TrackFix, nowMs: number): boolean {
  return fix.accuracyM <= LIVE_MAX_ACCURACY_M && nowMs - fix.timestampMs <= LIVE_MAX_FIX_AGE_MS;
}

export function isGpsLost(lastFixAtMs: number | null, nowMs: number): boolean {
  return lastFixAtMs !== null && nowMs - lastFixAtMs > LIVE_LOST_AFTER_MS;
}

export function shouldAutoPause(lastMovingAtMs: number, nowMs: number): boolean {
  return nowMs - lastMovingAtMs >= LIVE_PAUSE_HOLD_MS;
}

export function shouldAutoResume(movedM: number, speedMps: number): boolean {
  return movedM >= LIVE_RESUME_MOVE_M && speedMps >= LIVE_PAUSE_SPEED_MPS;
}

export function resetLiveTrackAnchor(state: LiveTrackState, fix: TrackFix | null): LiveTrackState {
  return { ...state, speedMps: 0, lastAccepted: fix };
}

export function reduceLiveTrack(state: LiveTrackState, fix: TrackFix, nowMs: number): LiveTrackState {
  if (!isFixUsable(fix, nowMs)) return state;
  const previous = state.lastAccepted;
  if (!previous) return { ...state, lastAccepted: fix, speedMps: 0 };

  const dtSec = (fix.timestampMs - previous.timestampMs) / 1000;
  if (dtSec <= 0) return state;
  const stepM = haversineMeters(previous, fix);
  const speedMps = stepM / dtSec;
  if (speedMps > LIVE_MAX_SPEED_MPS) return state;
  if (stepM < fix.accuracyM / 2) return state;

  const distanceM = state.distanceM + stepM;
  const movingMs = state.movingMs + dtSec * 1000;
  let splits = state.splits;
  let kmStartMovingMs = state.kmStartMovingMs;

  while (distanceM >= (splits.length + 1) * 1000) {
    const boundaryM = (splits.length + 1) * 1000;
    const fraction = stepM > 0 ? (boundaryM - state.distanceM) / stepM : 0;
    const crossedAtMs = state.movingMs + fraction * dtSec * 1000;
    splits = [
      ...splits,
      { km: splits.length + 1, paceSecPerKm: Math.max(1, Math.round((crossedAtMs - kmStartMovingMs) / 1000)) },
    ];
    kmStartMovingMs = crossedAtMs;
  }

  let paceEmaSecPerKm = state.paceEmaSecPerKm;
  if (stepM >= LIVE_MIN_EMA_STEP_M && speedMps >= LIVE_PAUSE_SPEED_MPS) {
    const instant = Math.min(Math.max(dtSec / (stepM / 1000), LIVE_MIN_PACE_SEC_PER_KM), LIVE_MAX_PACE_SEC_PER_KM);
    const alpha = 1 - Math.exp(-dtSec / LIVE_PACE_EMA_TAU_SEC);
    paceEmaSecPerKm = paceEmaSecPerKm === null ? instant : paceEmaSecPerKm + alpha * (instant - paceEmaSecPerKm);
  }

  return { distanceM, movingMs, splits, paceEmaSecPerKm, speedMps, lastAccepted: fix, kmStartMovingMs };
}
