import type { PlanAnchor, PlanPaces } from './types';
import { vdotFromPerformance } from './vdot';

export const STANDARD_RACE_KM = [5, 10, 21.0975, 42.195] as const;

const MARATHON_KM = 42.195;
const MARATHON_SEARCH_MIN_SEC = 1800;
const MARATHON_SEARCH_MAX_SEC = 28800;
const RIEGEL_EXPONENT = 1.06;
const DISTANCE_TOLERANCE = 0.004;
const MIN_DISTANCE_KM = 3;

export interface RacePrediction {
  distanceKm: number;
  timeSec: number;
  paceSecPerKm: number;
}

export function predictRaceTimes(
  vdot: number,
  distancesKm: readonly number[] = STANDARD_RACE_KM,
): RacePrediction[] | null {
  if (!Number.isFinite(vdot)) throw new Error('vdot must be finite');
  const predictions: RacePrediction[] = [];
  for (const distanceKm of distancesKm) {
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) throw new Error('distance must be positive');
    const scale = distanceKm / MARATHON_KM;
    let low = MARATHON_SEARCH_MIN_SEC * scale;
    let high = MARATHON_SEARCH_MAX_SEC * scale;
    if (vdot < vdotFromPerformance(distanceKm, high) || vdot > vdotFromPerformance(distanceKm, low)) return null;
    while (high - low > 1) {
      const mid = (low + high) / 2;
      if (vdotFromPerformance(distanceKm, mid) > vdot) low = mid;
      else high = mid;
    }
    const timeSec = Math.round((low + high) / 2);
    predictions.push({ distanceKm, timeSec, paceSecPerKm: Math.round(timeSec / distanceKm) });
  }
  return predictions;
}

export function riegelEquivalent(timeSec: number, fromKm: number, toKm: number): number {
  if (
    !Number.isFinite(timeSec) ||
    timeSec <= 0 ||
    !Number.isFinite(fromKm) ||
    fromKm <= 0 ||
    !Number.isFinite(toKm) ||
    toKm <= 0
  ) {
    throw new Error('time and distances must be positive');
  }
  return timeSec * Math.pow(toKm / fromKm, RIEGEL_EXPONENT);
}

export interface PersonalBestLog {
  id: string;
  log_date: string;
  distance_km: number | null;
  duration_sec: number | null;
}

export interface PersonalBest {
  distanceKm: number;
  timeSec: number;
  logDate: string;
  logId: string;
}

export function detectPersonalBests(
  logs: readonly PersonalBestLog[],
  distancesKm: readonly number[] = STANDARD_RACE_KM,
): PersonalBest[] {
  const bests: PersonalBest[] = [];
  for (const distanceKm of distancesKm) {
    let best: PersonalBest | null = null;
    for (const log of logs) {
      const distance = log.distance_km;
      const duration = log.duration_sec;
      if (distance === null || duration === null) continue;
      if (!Number.isFinite(distance) || !Number.isFinite(duration)) continue;
      if (distance < MIN_DISTANCE_KM || duration <= 0) continue;
      if (Math.abs(distance - distanceKm) > distanceKm * DISTANCE_TOLERANCE) continue;
      const faster = best === null || duration < best.timeSec;
      const tiedNewer =
        best !== null &&
        duration === best.timeSec &&
        (log.log_date > best.logDate || (log.log_date === best.logDate && log.id > best.logId));
      if (faster || tiedNewer) {
        best = { distanceKm, timeSec: duration, logDate: log.log_date, logId: log.id };
      }
    }
    if (best) bests.push(best);
  }
  return bests;
}

export function vdotFromAnchor(anchor: PlanAnchor): number {
  return vdotFromPerformance(anchor.distanceKm, anchor.timeSec);
}

export function vdotFromMarathonPace(marathonSecPerKm: number): number {
  return vdotFromPerformance(MARATHON_KM, marathonSecPerKm * MARATHON_KM);
}

export function vdotFromPlan(input: { paces: PlanPaces | null; anchor: PlanAnchor | null }): number | null {
  if (input.paces) return vdotFromMarathonPace(input.paces.marathonSecPerKm);
  if (input.anchor) return vdotFromAnchor(input.anchor);
  return null;
}
