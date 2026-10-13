import type { LocalizedText, PaceZone, PlanPaces, WorkoutStep } from './types';
import { formatDuration, formatPace } from './vdot';

const GUIDED_RUN_TYPES = new Set(['EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS']);

export const DEFAULT_PACE_SEC_PER_KM = 360;

export type GuidedCueKind =
  | 'START'
  | 'SEGMENT_START'
  | 'REPEAT'
  | 'PACE'
  | 'SEGMENT_END'
  | 'HALFWAY'
  | 'PAUSE'
  | 'RESUME'
  | 'SKIP'
  | 'FINISH'
  | 'DISTANCE';

export interface GuidedWorkoutInput {
  type: string;
  paceZone: string | null;
  distanceKm: number;
  steps: WorkoutStep[];
}

export interface TimelineSegment {
  index: number;
  stepIndex: number;
  label: string;
  repeatIndex?: number;
  repeatTotal?: number;
  durationSec: number;
  distanceKm?: number;
  paceSecPerKm?: number;
  paceLabel?: string;
  estimated: boolean;
}

export interface GuidedTimeline {
  segments: TimelineSegment[];
  totalDurationSec: number;
  totalDistanceKm: number;
  estimatedPaces: boolean;
  invalidReason?: 'NO_STEPS' | 'NOT_A_RUN';
}

export interface SegmentPosition {
  segment: TimelineSegment;
  offsetSec: number;
  remainingSec: number;
}

export interface GuidedCueContext {
  label?: string;
  repeatIndex?: number;
  repeatTotal?: number;
  paceLabel?: string | null;
  elapsedSec?: number;
  distanceKm?: number;
}

const ZONE_FIELD: Record<PaceZone, keyof PlanPaces> = {
  E: 'easyFastSecPerKm',
  M: 'marathonSecPerKm',
  T: 'thresholdSecPerKm',
  I: 'intervalSecPerKm',
  R: 'repetitionSecPerKm',
};

export function isGuidedRunType(type: string): boolean {
  return GUIDED_RUN_TYPES.has(type);
}

export function parsePaceLabel(value?: string): number | null {
  if (!value) return null;
  const match = /^(\d{1,3}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const seconds = Number(match[2]);
  if (seconds > 59) return null;
  return Number(match[1]) * 60 + seconds;
}

function resolvePace(
  step: WorkoutStep,
  paces: PlanPaces | null,
  paceZone: string | null,
): { paceSecPerKm: number; estimated: boolean } {
  const fromLabel = parsePaceLabel(step.pace);
  if (fromLabel !== null) return { paceSecPerKm: fromLabel, estimated: false };
  const field = paceZone ? ZONE_FIELD[paceZone as PaceZone] : undefined;
  if (field && paces) return { paceSecPerKm: paces[field], estimated: false };
  return { paceSecPerKm: DEFAULT_PACE_SEC_PER_KM, estimated: true };
}

function isTimeable(step: WorkoutStep): boolean {
  return Boolean((step.durationSec && step.durationSec > 0) || (step.distanceKm && step.distanceKm > 0));
}

export function buildStepTimeline(workout: GuidedWorkoutInput, paces: PlanPaces | null): GuidedTimeline {
  const empty: GuidedTimeline = { segments: [], totalDurationSec: 0, totalDistanceKm: 0, estimatedPaces: false };
  if (!isGuidedRunType(workout.type)) return { ...empty, invalidReason: 'NOT_A_RUN' };

  const timeable = workout.steps.map((step, stepIndex) => ({ step, stepIndex })).filter(({ step }) => isTimeable(step));
  if (timeable.length === 0) return { ...empty, invalidReason: 'NO_STEPS' };

  const segments: TimelineSegment[] = [];
  let estimatedPaces = false;
  let cursor = 0;

  while (cursor < timeable.length) {
    const label = timeable[cursor].step.label;
    let end = cursor;
    while (end + 1 < timeable.length && timeable[end + 1].step.label === label) end += 1;
    const repeatTotal = end - cursor + 1;

    for (let offset = 0; offset < repeatTotal; offset += 1) {
      const { step, stepIndex } = timeable[cursor + offset];
      const distanceKm = step.distanceKm && step.distanceKm > 0 ? step.distanceKm : undefined;
      const explicitDuration = step.durationSec && step.durationSec > 0 ? step.durationSec : undefined;
      let durationSec: number;
      let paceSecPerKm: number | undefined;
      let estimated = false;

      if (explicitDuration !== undefined) {
        durationSec = Math.round(explicitDuration);
        paceSecPerKm = parsePaceLabel(step.pace) ?? undefined;
      } else {
        const resolved = resolvePace(step, paces, workout.paceZone);
        paceSecPerKm = resolved.paceSecPerKm;
        estimated = resolved.estimated;
        if (estimated) estimatedPaces = true;
        durationSec = Math.round((distanceKm as number) * resolved.paceSecPerKm);
      }
      if (durationSec <= 0) continue;

      segments.push({
        index: segments.length,
        stepIndex,
        label,
        ...(repeatTotal > 1 ? { repeatIndex: offset + 1, repeatTotal } : {}),
        durationSec,
        ...(distanceKm !== undefined ? { distanceKm } : {}),
        ...(paceSecPerKm !== undefined ? { paceSecPerKm } : {}),
        ...(paceSecPerKm !== undefined ? { paceLabel: formatPace(paceSecPerKm) } : {}),
        estimated,
      });
    }
    cursor = end + 1;
  }

  if (segments.length === 0) return { ...empty, invalidReason: 'NO_STEPS' };

  const totalDurationSec = segments.reduce((sum, segment) => sum + segment.durationSec, 0);
  const totalDistanceKm = Math.round(segments.reduce((sum, segment) => sum + (segment.distanceKm ?? 0), 0) * 100) / 100;

  return { segments, totalDurationSec, totalDistanceKm, estimatedPaces };
}

export function segmentAt(timeline: GuidedTimeline, elapsedSec: number): SegmentPosition | null {
  if (timeline.segments.length === 0) return null;
  const clamped = Math.max(0, elapsedSec);
  let accumulated = 0;
  for (const segment of timeline.segments) {
    accumulated += segment.durationSec;
    if (clamped < accumulated) {
      const start = accumulated - segment.durationSec;
      return { segment, offsetSec: Math.max(0, clamped - start), remainingSec: accumulated - clamped };
    }
  }
  const last = timeline.segments[timeline.segments.length - 1];
  return { segment: last, offsetSec: last.durationSec, remainingSec: 0 };
}

export function elapsedAfterSkip(timeline: GuidedTimeline, segmentIndex: number): number {
  let total = 0;
  for (const segment of timeline.segments) {
    if (segment.index >= segmentIndex) break;
    total += segment.durationSec;
  }
  return Math.min(total, timeline.totalDurationSec);
}

export function cueTextFor(kind: GuidedCueKind, context: GuidedCueContext = {}): LocalizedText {
  switch (kind) {
    case 'START':
      return { key: 'content:guided.cue.start' };
    case 'SEGMENT_START':
      return context.label
        ? { key: 'content:guided.cue.segmentStart', params: { label: context.label } }
        : { key: 'content:guided.cue.segmentStartFallback' };
    case 'REPEAT':
      return {
        key: 'content:guided.cue.repeat',
        params: { index: context.repeatIndex ?? 1, total: context.repeatTotal ?? 1 },
      };
    case 'PACE':
      return { key: 'content:guided.cue.pace', params: { pace: context.paceLabel ?? '' } };
    case 'SEGMENT_END':
      return { key: 'content:guided.cue.segmentEnd' };
    case 'HALFWAY':
      return { key: 'content:guided.cue.halfway' };
    case 'PAUSE':
      return { key: 'content:guided.cue.pause' };
    case 'RESUME':
      return { key: 'content:guided.cue.resume' };
    case 'SKIP':
      return context.label
        ? { key: 'content:guided.cue.skip', params: { label: context.label } }
        : { key: 'content:guided.cue.skipFallback' };
    case 'FINISH':
      return { key: 'content:guided.cue.finish', params: { elapsed: formatDuration(context.elapsedSec ?? 0) } };
    case 'DISTANCE':
      return { key: 'content:guided.cue.distance', params: { km: context.distanceKm ?? 0 } };
  }
}
