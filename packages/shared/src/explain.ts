import type { LocalizedText, PaceZone, PlanPaces, PlanPhase, WorkoutType } from './types';
import { formatPace } from './vdot';

export interface ExplainInput {
  type: WorkoutType;
  phase: PlanPhase;
  paceZone: PaceZone | null;
  distanceKm: number;
}

export interface ExplainOptions {
  paces?: PlanPaces | null;
}

export interface WorkoutExplanation {
  why: LocalizedText;
  how: LocalizedText[];
  mistake: LocalizedText;
  effortLabel: LocalizedText;
  effortCue: LocalizedText;
}

interface TypeContent {
  why: LocalizedText;
  how: [LocalizedText, LocalizedText];
  mistake: LocalizedText;
  effortLabel: LocalizedText;
  effortCue: LocalizedText;
}

function typeKey(type: WorkoutType, part: string): string {
  return `content:explain.types.${type}.${part}`;
}

const TYPE_CONTENT: Record<WorkoutType, TypeContent> = {
  EASY: {
    why: { key: typeKey('EASY', 'why') },
    how: [{ key: typeKey('EASY', 'how.0') }, { key: typeKey('EASY', 'how.1') }],
    mistake: { key: typeKey('EASY', 'mistake') },
    effortLabel: { key: typeKey('EASY', 'effortLabel') },
    effortCue: { key: typeKey('EASY', 'effortCue') },
  },
  LONG: {
    why: { key: typeKey('LONG', 'why') },
    how: [{ key: typeKey('LONG', 'how.0') }, { key: typeKey('LONG', 'how.1') }],
    mistake: { key: typeKey('LONG', 'mistake') },
    effortLabel: { key: typeKey('LONG', 'effortLabel') },
    effortCue: { key: typeKey('LONG', 'effortCue') },
  },
  TEMPO: {
    why: { key: typeKey('TEMPO', 'why') },
    how: [{ key: typeKey('TEMPO', 'how.0') }, { key: typeKey('TEMPO', 'how.1') }],
    mistake: { key: typeKey('TEMPO', 'mistake') },
    effortLabel: { key: typeKey('TEMPO', 'effortLabel') },
    effortCue: { key: typeKey('TEMPO', 'effortCue') },
  },
  INTERVALS: {
    why: { key: typeKey('INTERVALS', 'why') },
    how: [{ key: typeKey('INTERVALS', 'how.0') }, { key: typeKey('INTERVALS', 'how.1') }],
    mistake: { key: typeKey('INTERVALS', 'mistake') },
    effortLabel: { key: typeKey('INTERVALS', 'effortLabel') },
    effortCue: { key: typeKey('INTERVALS', 'effortCue') },
  },
  REPETITIONS: {
    why: { key: typeKey('REPETITIONS', 'why') },
    how: [{ key: typeKey('REPETITIONS', 'how.0') }, { key: typeKey('REPETITIONS', 'how.1') }],
    mistake: { key: typeKey('REPETITIONS', 'mistake') },
    effortLabel: { key: typeKey('REPETITIONS', 'effortLabel') },
    effortCue: { key: typeKey('REPETITIONS', 'effortCue') },
  },
  REST: {
    why: { key: typeKey('REST', 'why') },
    how: [{ key: typeKey('REST', 'how.0') }, { key: typeKey('REST', 'how.1') }],
    mistake: { key: typeKey('REST', 'mistake') },
    effortLabel: { key: typeKey('REST', 'effortLabel') },
    effortCue: { key: typeKey('REST', 'effortCue') },
  },
  RACE: {
    why: { key: typeKey('RACE', 'why') },
    how: [{ key: typeKey('RACE', 'how.0') }, { key: typeKey('RACE', 'how.1') }],
    mistake: { key: typeKey('RACE', 'mistake') },
    effortLabel: { key: typeKey('RACE', 'effortLabel') },
    effortCue: { key: typeKey('RACE', 'effortCue') },
  },
  STRENGTH: {
    why: { key: typeKey('STRENGTH', 'why') },
    how: [{ key: typeKey('STRENGTH', 'how.0') }, { key: typeKey('STRENGTH', 'how.1') }],
    mistake: { key: typeKey('STRENGTH', 'mistake') },
    effortLabel: { key: typeKey('STRENGTH', 'effortLabel') },
    effortCue: { key: typeKey('STRENGTH', 'effortCue') },
  },
};

const EFFORT_SUFFIX_PHASES: ReadonlySet<PlanPhase> = new Set(['TAPER', 'RACE']);

const ZONE_FIELDS: Record<Exclude<PaceZone, 'E'>, keyof PlanPaces> = {
  M: 'marathonSecPerKm',
  T: 'thresholdSecPerKm',
  I: 'intervalSecPerKm',
  R: 'repetitionSecPerKm',
};

function paceFor(zone: PaceZone, paces: PlanPaces): string {
  if (zone === 'E') return `${formatPace(paces.easyFastSecPerKm)}–${formatPace(paces.easySlowSecPerKm)}`;
  return formatPace(paces[ZONE_FIELDS[zone]]);
}

export function describeWorkout(input: ExplainInput, options: ExplainOptions = {}): WorkoutExplanation {
  const base = TYPE_CONTENT[input.type];
  const useLongDistance = input.type === 'LONG' && input.distanceKm > 0;
  const why: LocalizedText = useLongDistance
    ? { key: typeKey('LONG', 'whyWithDistance'), params: { km: input.distanceKm } }
    : base.why;
  const how = [...base.how];
  if (input.paceZone && options.paces) {
    how[0] = {
      ...how[0],
      suffix: {
        key: 'content:explain.paceSuffix',
        params: { zone: input.paceZone, pace: paceFor(input.paceZone, options.paces) },
      },
    };
  }
  const effortCue: LocalizedText = EFFORT_SUFFIX_PHASES.has(input.phase)
    ? { ...base.effortCue, suffix: { key: `content:explain.effortSuffix.${input.phase}` } }
    : base.effortCue;

  return {
    why: { ...why, suffix: { key: `content:explain.phase.${input.phase}` } },
    how,
    mistake: base.mistake,
    effortLabel: base.effortLabel,
    effortCue,
  };
}
