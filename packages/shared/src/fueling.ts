import type { LocalizedText } from './types';

export interface FuelingCue {
  atSec: number;
  text: LocalizedText;
}

export interface FuelingPlan {
  pre: LocalizedText[];
  during: FuelingCue[];
  post: LocalizedText[];
}

export interface FuelingInput {
  type: string;
  durationSec: number;
  distanceKm?: number;
  paceSecPerKm?: number;
  apparentC?: number | null;
}

const FUELING_TYPES: ReadonlySet<string> = new Set(['LONG', 'RACE', 'TEMPO']);
const TEMPO_MIN_DURATION_SEC = 75 * 60;
const FIRST_GEL_SEC = 40 * 60;
const GEL_INTERVAL_SEC = 35 * 60;
const GEL_MARGIN_SEC = 10 * 60;

export function hydrationForTemp(apparentC?: number | null): string {
  if (apparentC === null || apparentC === undefined || !Number.isFinite(apparentC)) {
    return 'content:fueling.hydration.default';
  }
  if (apparentC < 5) return 'content:fueling.hydration.cold';
  if (apparentC < 15) return 'content:fueling.hydration.cool';
  if (apparentC < 25) return 'content:fueling.hydration.warm';
  return 'content:fueling.hydration.hot';
}

function resolveDuration(input: FuelingInput): number {
  if (input.durationSec > 0 && Number.isFinite(input.durationSec)) return input.durationSec;
  const { distanceKm, paceSecPerKm } = input;
  if (distanceKm && distanceKm > 0 && paceSecPerKm && paceSecPerKm > 0) {
    return Math.round(distanceKm * paceSecPerKm);
  }
  return 0;
}

function preRunLines(durationSec: number, type: string): LocalizedText[] {
  const snackKey =
    durationSec >= 90 * 60
      ? 'content:fueling.pre.snackLong'
      : durationSec >= 60 * 60
        ? 'content:fueling.pre.snackMedium'
        : 'content:fueling.pre.snackShort';
  const lines: LocalizedText[] = [
    { key: 'content:fueling.pre.meal' },
    { key: snackKey },
    { key: 'content:fueling.pre.water' },
  ];
  if (type === 'RACE') lines.push({ key: 'content:fueling.pre.race' });
  return lines;
}

function duringCues(durationSec: number): FuelingCue[] {
  if (durationSec < TEMPO_MIN_DURATION_SEC) return [];
  const cues: FuelingCue[] = [];
  let atSec = FIRST_GEL_SEC;
  let index = 1;
  while (atSec <= durationSec - GEL_MARGIN_SEC) {
    cues.push({ atSec, text: { key: 'content:fueling.during.gel', params: { index } } });
    atSec += GEL_INTERVAL_SEC;
    index += 1;
  }
  return cues;
}

function postRunLines(): LocalizedText[] {
  return [{ key: 'content:fueling.post.recovery' }, { key: 'content:fueling.post.rehydrate' }];
}

export function buildFuelingPlan(input: FuelingInput): FuelingPlan | null {
  if (!FUELING_TYPES.has(input.type)) return null;
  const durationSec = resolveDuration(input);
  if (durationSec <= 0) return null;
  if (input.type === 'TEMPO' && durationSec < TEMPO_MIN_DURATION_SEC) return null;
  return {
    pre: preRunLines(durationSec, input.type),
    during: duringCues(durationSec),
    post: postRunLines(),
  };
}
