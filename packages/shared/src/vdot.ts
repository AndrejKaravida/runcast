import type { PlanPaces } from './types';

export function vo2OfVelocity(metersPerMinute: number): number {
  return -4.6 + 0.182258 * metersPerMinute + 0.000104 * metersPerMinute * metersPerMinute;
}

export function vdotFromPerformance(distanceKm: number, timeSec: number): number {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(timeSec) || distanceKm <= 0 || timeSec <= 0) {
    throw new Error('distance and time must be positive');
  }
  const minutes = timeSec / 60;
  const velocity = (distanceKm * 1000) / minutes;
  const percent = 0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.298958 * Math.exp(-0.1932605 * minutes);
  return vo2OfVelocity(velocity) / percent;
}

export function vdotVelocityMetersPerMinute(vdot: number): number {
  const a = 0.000104;
  const b = 0.182258;
  const c = -(4.6 + vdot);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

export function pacesFromVdot(vdot: number): PlanPaces {
  if (!Number.isFinite(vdot)) throw new Error('vdot must be finite');
  const bounded = Math.min(Math.max(vdot, 20), 90);
  const velocity = vdotVelocityMetersPerMinute(bounded);
  const paceAtVo2Fraction = (fraction: number): number =>
    Math.round((1000 / vdotVelocityMetersPerMinute(fraction * bounded)) * 60);
  const paceAtVelocityFraction = (fraction: number): number => Math.round((1000 / (velocity * fraction)) * 60);
  return {
    easySlowSecPerKm: paceAtVo2Fraction(0.59),
    easyFastSecPerKm: paceAtVo2Fraction(0.74),
    marathonSecPerKm: paceAtVo2Fraction(0.8),
    thresholdSecPerKm: paceAtVo2Fraction(0.86),
    intervalSecPerKm: paceAtVelocityFraction(0.98),
    repetitionSecPerKm: paceAtVelocityFraction(1.07),
  };
}

export function formatPace(secPerKm: number): string {
  const total = Math.round(secPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatDuration(totalSec: number): string {
  const total = Math.round(totalSec);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
