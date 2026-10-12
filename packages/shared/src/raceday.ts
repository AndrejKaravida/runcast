import type { WeatherAssessment } from './weather-rules';

export type RaceStrategy = 'even' | 'negative';

export interface PaceSplit {
  label: string;
  distanceKm: number;
  paceSecPerKm: number;
  segmentSec: number;
  cumulativeSec: number;
}

export type ChecklistGroup = 'dan_pre' | 'jutro' | 'staza';

export interface ChecklistItem {
  id: string;
  label: string;
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

function fmtKm(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

function segmentDistances(distanceKm: number): number[] {
  const segKm: number = distanceKm >= 10 ? SEGMENT_KM : SHORT_SEGMENT_KM;
  const fullCount = Math.floor(distanceKm / segKm + 1e-9);
  const segments = Array.from({ length: fullCount }, () => segKm);
  const last = round3(distanceKm - fullCount * segKm);
  if (last > 0.01) segments.push(last);
  return segments.length > 0 ? segments : [round3(distanceKm)];
}

function splitLabel(fromKm: number, toKm: number, index: number, segKm: number): string {
  if (segKm < SEGMENT_KM) return `${index + 1}. km`;
  return `${fmtKm(fromKm)}–${fmtKm(toKm)} km`;
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
    { id: 'kit', label: 'Spakuj opremu: patike, čarape, šorc i majicu (probano u treningu)', group: 'dan_pre' },
    { id: 'bib', label: 'Prikvači startni broj na majicu', group: 'dan_pre' },
    { id: 'watch', label: 'Napuni sat i telefon', group: 'dan_pre' },
    ...(long ? [{ id: 'fuel', label: 'Pripremi gelove, elektrolite i flašicu', group: 'dan_pre' as const }] : []),
    { id: 'logistics', label: 'Proveri rutu do starta i preuzimanje broja', group: 'dan_pre' },
    ...(long
      ? [
          {
            id: 'drop-bag',
            label: 'Spakuj drop-bag: suvu majicu, užinu i patike za posle',
            group: 'dan_pre' as const,
          },
        ]
      : []),
    { id: 'alarm', label: 'Postavi dva alarma', group: 'dan_pre' },
    { id: 'breakfast', label: 'Doručak 2–3 h pre starta (probano u treningu)', group: 'jutro' },
    { id: 'hydrate', label: 'Popij 200–300 ml vode 60–90 min pre starta', group: 'jutro' },
    { id: 'antichafe', label: 'Anti-chafe na butine, pazuh i stopala', group: 'jutro' },
    { id: 'toilet', label: 'WC 30–45 min pre starta', group: 'jutro' },
    {
      id: 'warmup',
      label: long ? 'Kratko zagrevanje 10 min + par ubrzanja' : 'Zagrevanje 10–15 min + 2–4 ubrzanja',
      group: 'jutro',
    },
    {
      id: 'first-km',
      label: long ? 'Prvi km disciplinovano — 5–10 s/km sporije od cilja' : 'Kontrolisano jako od starta, bez sprinta',
      group: 'staza',
    },
    ...(long
      ? [{ id: 'gel-plan', label: 'Gel svakih 30–35 min + voda na svakoj stanici', group: 'staza' as const }]
      : []),
    { id: 'effort', label: 'Po vetru i uzbrdici trči po naporu, ne po satu', group: 'staza' },
    { id: 'finish', label: long ? 'Zadnja 2 km pusti ako imaš' : 'Zadnji km pusti sve', group: 'staza' },
  ];
}

export function raceWeatherNote(assessment: WeatherAssessment): string | null {
  switch (assessment.code) {
    case 'STORM':
      return 'Grmljavina — proveri pravila trke i drži se plana ishrane.';
    case 'RAIN':
      return 'Kiša — anti-chafe, kapica i suve čarape; tempo ostaje isti.';
    case 'HEAT':
      return 'Vruće — kreni konzervativnije i pij na svakoj stanici.';
    case 'COLD':
      return 'Hladno — slojevi za čekanje na startu i duže zagrevanje.';
    case 'WIND':
      return 'Vetar — trči po naporu, ne juri tempo po satu.';
    case 'AIR':
      return 'Loš vazduh — smanji intenzitet i prati kako se osećaš.';
    default:
      return null;
  }
}
