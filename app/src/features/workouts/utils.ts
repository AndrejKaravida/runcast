import { formatDuration, formatPace, isGuidedRunType, type PlanPaces, type WorkoutStep } from '@runcast/shared';
import type { TFunction } from 'i18next';
import type { WorkoutsRow } from '@/types';

export function workoutSteps(row: WorkoutsRow): WorkoutStep[] {
  return Array.isArray(row.steps) ? (row.steps as unknown as WorkoutStep[]) : [];
}

const TYPE_KEYS: Record<string, string> = {
  EASY: 'common:type.easy',
  LONG: 'common:type.long',
  TEMPO: 'common:type.tempo',
  INTERVALS: 'common:type.intervals',
  REPETITIONS: 'common:type.repetitions',
  REST: 'common:type.rest',
  RACE: 'common:type.race',
  STRENGTH: 'common:type.strength',
};

export function typeLabel(t: TFunction, type: string): string {
  const key = TYPE_KEYS[type];
  return key ? t(key) : type;
}

const PHASE_KEYS: Record<string, string> = {
  BASE: 'plan:phase.base',
  BUILD: 'plan:phase.build',
  PEAK: 'plan:phase.peak',
  TAPER: 'plan:phase.taper',
  RACE: 'plan:phase.race',
};

export function phaseLabel(t: TFunction, phase: string): string {
  const key = PHASE_KEYS[phase];
  return key ? t(key) : phase;
}

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'rain';

export function typeTone(type: string): Tone {
  if (type === 'EASY') return 'success';
  if (type === 'LONG') return 'rain';
  if (type === 'TEMPO') return 'primary';
  if (type === 'INTERVALS' || type === 'STRENGTH') return 'warning';
  if (type === 'REPETITIONS' || type === 'RACE') return 'danger';
  return 'neutral';
}

export function statusTone(status: string): Tone {
  if (status === 'DONE') return 'success';
  if (status === 'SKIPPED') return 'danger';
  return 'neutral';
}

export const TONE_DOT_CLASSES: Record<Tone, string> = {
  neutral: 'bg-text-muted',
  primary: 'bg-primary-ink',
  success: 'bg-success-ink',
  warning: 'bg-warning-ink',
  danger: 'bg-danger-ink',
  rain: 'bg-rain-ink',
};

export const TONE_TEXT_CLASSES: Record<Tone, string> = {
  neutral: 'text-text-muted',
  primary: 'text-primary-ink',
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  danger: 'text-danger-ink',
  rain: 'text-rain-ink',
};

export const PHASE_BAR_CLASSES: Record<string, string> = {
  BASE: 'bg-phase-base',
  BUILD: 'bg-phase-build',
  PEAK: 'bg-phase-peak',
  TAPER: 'bg-phase-taper',
  RACE: 'bg-phase-race',
};

export function phaseBarClass(phase: string): string {
  return PHASE_BAR_CLASSES[phase] ?? PHASE_BAR_CLASSES.BUILD;
}

export function workoutDurationSec(row: WorkoutsRow): number | null {
  if (row.duration_sec) return row.duration_sec;
  const total = workoutSteps(row).reduce((sum, step) => sum + (step.durationSec ?? 0), 0);
  return total > 0 ? total : null;
}

const ZONE_PACE_FIELD: Record<string, keyof PlanPaces> = {
  E: 'easyFastSecPerKm',
  M: 'marathonSecPerKm',
  T: 'thresholdSecPerKm',
  I: 'intervalSecPerKm',
  R: 'repetitionSecPerKm',
};

export function workoutPaceLabel(row: WorkoutsRow, paces: PlanPaces | null): string | null {
  const stepPace = workoutSteps(row).find((step) => step.pace)?.pace ?? null;
  if (stepPace) return stepPace;
  if (!row.pace_zone || !paces) return null;
  const field = ZONE_PACE_FIELD[row.pace_zone];
  if (!field) return null;
  return formatPace(paces[field]);
}

export interface HeroStat {
  label: string;
  value: string;
}

export function heroStats(t: TFunction, row: WorkoutsRow, paces: PlanPaces | null): HeroStat[] {
  const stats: HeroStat[] = [];
  if (row.distance_km > 0) stats.push({ label: t('common:stats.distance'), value: `${row.distance_km} km` });
  const duration = workoutDurationSec(row);
  if (duration && stats.length < 3) stats.push({ label: t('common:stats.duration'), value: formatDuration(duration) });
  const pace = isGuidedRunType(row.type) ? workoutPaceLabel(row, paces) : null;
  if (pace && stats.length < 3) stats.push({ label: t('common:stats.pace'), value: `${pace} /km` });
  const stepCount = workoutSteps(row).length;
  if (row.type === 'STRENGTH' && stepCount > 0 && stats.length < 3) {
    stats.push({ label: t('common:stats.steps'), value: String(stepCount) });
  }
  return stats;
}
