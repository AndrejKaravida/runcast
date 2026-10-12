import type { WorkoutStep } from '@runcast/shared';
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
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'rain';

export function typeTone(type: string): Tone {
  if (type === 'TEMPO' || type === 'INTERVALS' || type === 'REPETITIONS') return 'primary';
  if (type === 'LONG') return 'rain';
  if (type === 'RACE') return 'danger';
  if (type === 'REST') return 'neutral';
  return 'neutral';
}

export function statusTone(status: string): Tone {
  if (status === 'DONE') return 'success';
  if (status === 'SKIPPED') return 'danger';
  return 'neutral';
}

export const TONE_DOT_CLASSES: Record<Tone, string> = {
  neutral: 'bg-text-muted',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  rain: 'bg-rain',
};
