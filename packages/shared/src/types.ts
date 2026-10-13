export type RunWindow = 'morning' | 'evening' | 'flexible';
export type Experience = 'first' | 'experienced';
export type VolumeBand = 'lt20' | '20-40' | '40-60' | 'gt60';
export type WorkoutType = 'EASY' | 'LONG' | 'TEMPO' | 'INTERVALS' | 'REPETITIONS' | 'REST' | 'RACE' | 'STRENGTH';

export const RUN_TYPES = ['EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'RACE'] as const;

export type RunType = (typeof RUN_TYPES)[number];

export function isRunType(type: string): type is RunType {
  return (RUN_TYPES as readonly string[]).includes(type);
}

export type PaceZone = 'E' | 'M' | 'T' | 'I' | 'R';
export type WorkoutStatus = 'PLANNED' | 'DONE' | 'SKIPPED';
export type PlanPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RACE';

export interface LocalizedText {
  key: string;
  params?: Record<string, string | number>;
  suffix?: LocalizedText;
}

export interface WorkoutStep {
  label: string;
  distanceKm?: number;
  durationSec?: number;
  pace?: string;
}

export interface WorkoutDraft {
  date: string;
  type: WorkoutType;
  title: string;
  distanceKm: number;
  durationSec: number | null;
  paceZone: PaceZone | null;
  steps: WorkoutStep[];
  phase: PlanPhase;
  weekIndex: number;
}

export interface PlanPaces {
  easySlowSecPerKm: number;
  easyFastSecPerKm: number;
  marathonSecPerKm: number;
  thresholdSecPerKm: number;
  intervalSecPerKm: number;
  repetitionSecPerKm: number;
}

export interface PlanAnchor {
  kind: 'race' | 'goal';
  distanceKm: number;
  timeSec: number;
}

export interface PlanConfig {
  raceDate: string;
  startDate: string;
  distanceKm?: number;
  daysPerWeek: 3 | 4 | 5 | 6;
  longRunDay: number;
  experience: Experience;
  volumeBand: VolumeBand;
  anchor: PlanAnchor | null;
}

export interface PlanDraft {
  weeks: number;
  paces: PlanPaces | null;
  anchor: PlanAnchor | null;
  workouts: WorkoutDraft[];
}
