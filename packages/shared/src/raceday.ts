import type { LocalizedText } from './types';
import type { WeatherAssessment } from './weather-rules';

export type RaceStrategy = 'even' | 'negative';

export interface PaceSplit {
  label: LocalizedText;
  distanceKm: number;
  paceSecPerKm: number;
  segmentSec: number;
  cumulativeSec: number;
}

export type ChecklistGroup = 'dan_pre' | 'jutro' | 'staza';

export interface ChecklistItem {
  id: string;
  label: LocalizedText;
  group: ChecklistGroup;
}

const SEGMENT_KM = 5;
const SHORT_SEGMENT_KM = 1;
const LONG_RACE_KM = 15;
const NEGATIVE_SPLIT_AMPLITUDE = 0.02;

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive`);
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function segmentDistances(distanceKm: number): number[] {
  const segKm: number = distanceKm >= 10 ? SEGMENT_KM : SHORT_SEGMENT_KM;
  const fullCount = Math.floor(distanceKm / segKm + 1e-9);
  const segments = Array.from({ length: fullCount }, () => segKm);
  const last = round3(distanceKm - fullCount * segKm);
  if (last > 0.01) segments.push(last);
  return segments.length > 0 ? segments : [round3(distanceKm)];
}

function splitLabel(fromKm: number, toKm: number, index: number, segKm: number): LocalizedText {
  if (segKm < SEGMENT_KM) return { key: 'content:raceday.split.single', params: { index: index + 1 } };
  return { key: 'content:raceday.split.range', params: { from: fromKm, to: toKm } };
}

export function buildPacePlan(goalTimeSec: number, distanceKm: number, strategy: RaceStrategy): PaceSplit[] {
  assertPositive(goalTimeSec, 'goalTimeSec');
  assertPositive(distanceKm, 'distanceKm');
  if (strategy !== 'even' && strategy !== 'negative') throw new Error('unknown strategy');

  const segments = segmentDistances(distanceKm);
  const evenPace = goalTimeSec / distanceKm;
  let coveredKm = 0;

  const raw = segments.map((segKm) => {
    const midpointKm = coveredKm + segKm / 2;
    coveredKm += segKm;
    if (strategy === 'even') return segKm * evenPace;
    const multiplier = 1 + NEGATIVE_SPLIT_AMPLITUDE * (1 - (2 * midpointKm) / distanceKm);
    return segKm * evenPace * multiplier;
  });

  const rawTotal = raw.reduce((sum, value) => sum + value, 0);
  const times = raw.map((value) => Math.round((value * goalTimeSec) / rawTotal));
  const roundedTotal = times.reduce((sum, value) => sum + value, 0);
  times[times.length - 1] += goalTimeSec - roundedTotal;

  let cumulativeSec = 0;
  let cumulativeKm = 0;
  return segments.map((segKm, index) => {
    cumulativeSec += times[index];
    const fromKm = cumulativeKm;
    cumulativeKm = round3(cumulativeKm + segKm);
    return {
      label: splitLabel(fromKm, cumulativeKm, index, segKm),
      distanceKm: segKm,
      paceSecPerKm: Math.round(times[index] / segKm),
      segmentSec: times[index],
      cumulativeSec,
    };
  });
}

export function raceChecklist(distanceKm: number): ChecklistItem[] {
  const long = distanceKm >= LONG_RACE_KM;
  return [
    { id: 'kit', label: { key: 'content:raceday.checklist.kit' }, group: 'dan_pre' },
    { id: 'bib', label: { key: 'content:raceday.checklist.bib' }, group: 'dan_pre' },
    { id: 'watch', label: { key: 'content:raceday.checklist.watch' }, group: 'dan_pre' },
    ...(long ? [{ id: 'fuel', label: { key: 'content:raceday.checklist.fuel' }, group: 'dan_pre' as const }] : []),
    { id: 'logistics', label: { key: 'content:raceday.checklist.logistics' }, group: 'dan_pre' },
    ...(long
      ? [{ id: 'drop-bag', label: { key: 'content:raceday.checklist.dropBag' }, group: 'dan_pre' as const }]
      : []),
    { id: 'alarm', label: { key: 'content:raceday.checklist.alarm' }, group: 'dan_pre' },
    { id: 'breakfast', label: { key: 'content:raceday.checklist.breakfast' }, group: 'jutro' },
    { id: 'hydrate', label: { key: 'content:raceday.checklist.hydrate' }, group: 'jutro' },
    { id: 'antichafe', label: { key: 'content:raceday.checklist.antichafe' }, group: 'jutro' },
    { id: 'toilet', label: { key: 'content:raceday.checklist.toilet' }, group: 'jutro' },
    {
      id: 'warmup',
      label: { key: long ? 'content:raceday.checklist.warmupLong' : 'content:raceday.checklist.warmupShort' },
      group: 'jutro',
    },
    {
      id: 'first-km',
      label: { key: long ? 'content:raceday.checklist.firstKmLong' : 'content:raceday.checklist.firstKmShort' },
      group: 'staza',
    },
    ...(long ? [{ id: 'gel-plan', label: { key: 'content:raceday.checklist.gelPlan' }, group: 'staza' as const }] : []),
    { id: 'effort', label: { key: 'content:raceday.checklist.effort' }, group: 'staza' },
    {
      id: 'finish',
      label: { key: long ? 'content:raceday.checklist.finishLong' : 'content:raceday.checklist.finishShort' },
      group: 'staza',
    },
  ];
}

export function raceWeatherNote(assessment: WeatherAssessment): LocalizedText | null {
  switch (assessment.code) {
    case 'STORM':
      return { key: 'content:raceday.weather.storm' };
    case 'RAIN':
      return { key: 'content:raceday.weather.rain' };
    case 'HEAT':
      return { key: 'content:raceday.weather.heat' };
    case 'COLD':
      return { key: 'content:raceday.weather.cold' };
    case 'WIND':
      return { key: 'content:raceday.weather.wind' };
    case 'AIR':
      return { key: 'content:raceday.weather.air' };
    default:
      return null;
  }
}
