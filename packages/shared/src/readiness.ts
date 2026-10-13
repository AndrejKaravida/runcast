import { fmtKm } from './format';
import type { LocalizedText } from './types';

export type ReadinessLevel = 'fresh' | 'normal' | 'tired';

export interface ReadinessSnapshot {
  sleepHours: number | null;
  restingHr: number | null;
  hrv: number | null;
  source: 'healthkit' | 'healthconnect';
}

export interface ReadinessBaseline {
  rhrAvg: number | null;
  hrvAvg: number | null;
}

export interface ReadinessInput {
  sleepHours: number | null;
  restingHr: number | null;
  hrv: number | null;
  baseline: ReadinessBaseline | null;
}

export interface Readiness {
  score: number;
  level: ReadinessLevel;
  hints: LocalizedText[];
}

const SHORT_SLEEP_HOURS = 6;
const GOOD_SLEEP_HOURS = 7;
const FRESH_SCORE = 85;
const NORMAL_SCORE = 55;
const HRV_LOW_RATIO = 0.9;
const RHR_HIGH_BPM = 7;
const SIGNAL_PENALTY = 20;
const MAX_HINTS = 2;

function sleepScore(hours: number): number {
  if (hours >= 8) return 100;
  if (hours >= GOOD_SLEEP_HOURS) return 90;
  if (hours >= SHORT_SLEEP_HOURS) return 70;
  return 40;
}

function roundHours(hours: number): number {
  return Math.round(hours * 10) / 10;
}

export function computeReadiness({ sleepHours, restingHr, hrv, baseline }: ReadinessInput): Readiness {
  const hints: LocalizedText[] = [];
  let score = sleepHours === null ? 100 : sleepScore(sleepHours);

  if (sleepHours !== null && sleepHours < SHORT_SLEEP_HOURS) {
    hints.push({ key: 'today:readiness.hints.sleepShort', params: { hours: fmtKm(roundHours(sleepHours)) } });
  }

  if (hrv !== null && baseline && baseline.hrvAvg !== null && baseline.hrvAvg > 0) {
    const ratio = hrv / baseline.hrvAvg;
    if (ratio < HRV_LOW_RATIO) {
      score -= SIGNAL_PENALTY;
      hints.push({ key: 'today:readiness.hints.hrvLow', params: { pct: Math.round((1 - ratio) * 100) } });
    }
  }

  if (restingHr !== null && baseline && baseline.rhrAvg !== null && baseline.rhrAvg > 0) {
    const delta = restingHr - baseline.rhrAvg;
    if (delta > RHR_HIGH_BPM) {
      score -= SIGNAL_PENALTY;
      hints.push({ key: 'today:readiness.hints.rhrHigh', params: { bpm: Math.round(delta) } });
    }
  }

  const bounded = Math.min(100, Math.max(0, score));
  const level: ReadinessLevel =
    sleepHours !== null && sleepHours < SHORT_SLEEP_HOURS
      ? 'tired'
      : bounded >= FRESH_SCORE && sleepHours !== null && sleepHours >= GOOD_SLEEP_HOURS
        ? 'fresh'
        : bounded >= NORMAL_SCORE
          ? 'normal'
          : 'tired';

  return { score: bounded, level, hints: hints.slice(0, MAX_HINTS) };
}
