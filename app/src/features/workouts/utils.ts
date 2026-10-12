import { formatDuration, formatPace, isGuidedRunType, type PlanPaces, type WorkoutStep } from '@runcast/shared';
import type { WorkoutsRow } from '@/types';

export function workoutSteps(row: WorkoutsRow): WorkoutStep[] {
  return Array.isArray(row.steps) ? (row.steps as unknown as WorkoutStep[]) : [];
}

const TYPE_LABELS: Record<string, string> = {
  EASY: 'Lagano',
  LONG: 'Dugi trk',
  TEMPO: 'Tempo',
  INTERVALS: 'Intervali',
  REPETITIONS: 'Repeticije',
  REST: 'Odmor',
  RACE: 'Trka',
  STRENGTH: 'Snaga',
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

const PHASE_LABELS: Record<string, string> = {
  BASE: 'Baza',
  BUILD: 'Izgradnja',
  PEAK: 'Vrh',
  TAPER: 'Taper',
  RACE: 'Trka',
};

export function phaseLabel(phase: string): string {
  return PHASE_LABELS[phase] ?? phase;
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

export function heroStats(row: WorkoutsRow, paces: PlanPaces | null): HeroStat[] {
  const stats: HeroStat[] = [];
  if (row.distance_km > 0) stats.push({ label: 'Distanca', value: `${row.distance_km} km` });
  const duration = workoutDurationSec(row);
  if (duration && stats.length < 3) stats.push({ label: 'Trajanje', value: formatDuration(duration) });
  const pace = isGuidedRunType(row.type) ? workoutPaceLabel(row, paces) : null;
  if (pace && stats.length < 3) stats.push({ label: 'Tempo', value: `${pace} /km` });
  const stepCount = workoutSteps(row).length;
  if (row.type === 'STRENGTH' && stepCount > 0 && stats.length < 3) {
    stats.push({ label: 'Koraka', value: String(stepCount) });
  }
  return stats;
}
