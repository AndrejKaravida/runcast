import type { LocalizedText, PaceZone, PlanAnchor, PlanPaces } from './types';
import { formatPace, pacesFromVdot, vdotFromPerformance } from './vdot';

export const BENCHMARK_DISTANCES_KM = [5, 10] as const;
export const RACE_APPROACH_DAYS = 21;

export interface BenchmarkResult {
  distanceKm: number;
  timeSec: number;
}

export interface BenchmarkZone {
  zone: PaceZone;
  label: LocalizedText;
  oldPace: string | null;
  newPace: string;
  deltaSecPerKm: number | null;
}

export interface BenchmarkSuggestion {
  vdot: number;
  paces: PlanPaces;
  zones: BenchmarkZone[];
}

const ZONE_ORDER: readonly PaceZone[] = ['E', 'M', 'T', 'I', 'R'];

const ZONE_FIELDS: Record<PaceZone, readonly [keyof PlanPaces, keyof PlanPaces | null]> = {
  E: ['easyFastSecPerKm', 'easySlowSecPerKm'],
  M: ['marathonSecPerKm', null],
  T: ['thresholdSecPerKm', null],
  I: ['intervalSecPerKm', null],
  R: ['repetitionSecPerKm', null],
};

const PACE_MAP_FIELDS: readonly (keyof PlanPaces)[] = [
  'easyFastSecPerKm',
  'marathonSecPerKm',
  'thresholdSecPerKm',
  'intervalSecPerKm',
  'repetitionSecPerKm',
];

function zonePaceText(paces: PlanPaces, zone: PaceZone): string {
  const [fast, slow] = ZONE_FIELDS[zone];
  return slow === null ? formatPace(paces[fast]) : `${formatPace(paces[fast])}–${formatPace(paces[slow])}`;
}

function zoneAnchorSec(paces: PlanPaces, zone: PaceZone): number {
  const [fast, slow] = ZONE_FIELDS[zone];
  return slow === null ? paces[fast] : (paces[fast] + paces[slow]) / 2;
}

export function buildBenchmarkSuggestion(input: {
  distanceKm: number;
  timeSec: number;
  oldPaces: PlanPaces | null;
}): BenchmarkSuggestion {
  const vdot = vdotFromPerformance(input.distanceKm, input.timeSec);
  const paces = pacesFromVdot(vdot);
  const zones = ZONE_ORDER.map((zone) => ({
    zone,
    label: { key: `benchmark:zones.${zone}` },
    oldPace: input.oldPaces ? zonePaceText(input.oldPaces, zone) : null,
    newPace: zonePaceText(paces, zone),
    deltaSecPerKm: input.oldPaces ? Math.round(zoneAnchorSec(paces, zone) - zoneAnchorSec(input.oldPaces, zone)) : null,
  }));
  return { vdot, paces, zones };
}

export function benchmarkAnchor(result: BenchmarkResult): PlanAnchor {
  return { kind: 'race', distanceKm: result.distanceKm, timeSec: result.timeSec };
}

export function buildBenchmarkPaceMap(oldPaces: PlanPaces, newPaces: PlanPaces): Record<string, string> {
  const map: Record<string, string> = {};
  for (const field of PACE_MAP_FIELDS) {
    map[formatPace(oldPaces[field])] = formatPace(newPaces[field]);
  }
  return map;
}

export function isRaceApproaching(daysToRace: number): boolean {
  return daysToRace >= 0 && daysToRace <= RACE_APPROACH_DAYS;
}
