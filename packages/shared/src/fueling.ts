export interface FuelingCue {
  atSec: number;
  text: string;
}

export interface FuelingPlan {
  pre: string[];
  during: FuelingCue[];
  post: string[];
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
    return '400–800 ml/h (po žeđi i uslovima)';
  }
  if (apparentC < 5) return '400–500 ml/h';
  if (apparentC < 15) return '500–600 ml/h';
  if (apparentC < 25) return '600–700 ml/h';
  return '700–800 ml/h + elektroliti';
}

function resolveDuration(input: FuelingInput): number {
  if (input.durationSec > 0 && Number.isFinite(input.durationSec)) return input.durationSec;
  const { distanceKm, paceSecPerKm } = input;
  if (distanceKm && distanceKm > 0 && paceSecPerKm && paceSecPerKm > 0) {
    return Math.round(distanceKm * paceSecPerKm);
  }
  return 0;
}

function preRunLines(durationSec: number, type: string): string[] {
  const snack =
    durationSec >= 90 * 60
      ? 'Užina 2–3 h pre: 75+ g UH + malo proteina.'
      : durationSec >= 60 * 60
        ? 'Užina 60–90 min pre: 50+ g UH + malo proteina.'
        : 'Užina pred polazak: 25+ g UH (banana, tost sa medom).';
  const lines = [
    'Obrok 2–3 h pre trčanja: bogat UH (pasta, ovsena kaša), malo masti i proteina.',
    snack,
    'Popij ~500 ml vode 2 h pre starta.',
  ];
  if (type === 'RACE') lines.push('Gelove i tajming probaj na treningu — na dan trke ništa novo.');
  return lines;
}

function duringCues(durationSec: number): FuelingCue[] {
  if (durationSec < TEMPO_MIN_DURATION_SEC) return [];
  const cues: FuelingCue[] = [];
  let atSec = FIRST_GEL_SEC;
  let index = 1;
  while (atSec <= durationSec - GEL_MARGIN_SEC) {
    cues.push({ atSec, text: `Gel ${index} — popij ~200 ml vode.` });
    atSec += GEL_INTERVAL_SEC;
    index += 1;
  }
  return cues;
}

function postRunLines(): string[] {
  return [
    'U roku od 1–2 h: protein + UH (čokoladno mleko, jogurt + voće, sendvič).',
    'Rehidratacija: ~1,5 L tečnosti po kg izgubljene mase, uz natrijum.',
  ];
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
