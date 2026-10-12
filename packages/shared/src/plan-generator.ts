import type {
  Experience,
  PaceZone,
  PlanConfig,
  PlanDraft,
  PlanPaces,
  PlanPhase,
  VolumeBand,
  WorkoutDraft,
  WorkoutStep,
} from './types';
import { strengthWorkoutsForWeek } from './strength';
import { formatPace, pacesFromVdot, vdotFromPerformance } from './vdot';

const MS_PER_DAY = 86_400_000;

type RaceKind = 'M' | 'HM' | '10K' | '5K';

const RACE_VOLUME: Record<RaceKind, Record<VolumeBand, { start: number; peak: number }>> = {
  M: {
    lt20: { start: 20, peak: 55 },
    '20-40': { start: 28, peak: 62 },
    '40-60': { start: 42, peak: 82 },
    gt60: { start: 60, peak: 100 },
  },
  HM: {
    lt20: { start: 15, peak: 36 },
    '20-40': { start: 25, peak: 48 },
    '40-60': { start: 38, peak: 60 },
    gt60: { start: 50, peak: 72 },
  },
  '10K': {
    lt20: { start: 15, peak: 30 },
    '20-40': { start: 25, peak: 40 },
    '40-60': { start: 36, peak: 52 },
    gt60: { start: 48, peak: 65 },
  },
  '5K': {
    lt20: { start: 12, peak: 24 },
    '20-40': { start: 20, peak: 32 },
    '40-60': { start: 30, peak: 48 },
    gt60: { start: 42, peak: 55 },
  },
};

const RACE_LONG_PEAK: Record<RaceKind, Record<VolumeBand, number>> = {
  M: { lt20: 30, '20-40': 32, '40-60': 32, gt60: 34 },
  HM: { lt20: 18, '20-40': 19, '40-60': 21, gt60: 21 },
  '10K': { lt20: 11, '20-40': 12, '40-60': 15, gt60: 18 },
  '5K': { lt20: 8, '20-40': 10, '40-60': 14, gt60: 14 },
};

const RACE_PEAK_SHARE: Record<RaceKind, Record<VolumeBand, number>> = {
  M: { lt20: 0.55, '20-40': 0.52, '40-60': 0.39, gt60: 0.34 },
  HM: { lt20: 0.5, '20-40': 0.4, '40-60': 0.35, gt60: 0.29 },
  '10K': { lt20: 0.37, '20-40': 0.3, '40-60': 0.29, gt60: 0.28 },
  '5K': { lt20: 0.33, '20-40': 0.31, '40-60': 0.29, gt60: 0.26 },
};

const BASE_LONG_PEAK: Record<RaceKind, number> = { M: 18, HM: 18, '10K': 12, '5K': 10 };

const FIRST_PEAK_KM = 60;
const FIRST_LONG_KM = 30;
const MIN_LONG_KM = 5;
const TAPER_VOLUME_FACTORS = [0.8, 0.6, 0.4];
const TAPER_LONG_FACTORS = [0.7, 0.5];

const TEMPLATES: Record<number, { base: number; build: number; peak: number; taper: number }> = {
  18: { base: 5, build: 8, peak: 2, taper: 3 },
  16: { base: 4, build: 7, peak: 2, taper: 3 },
  14: { base: 3, build: 6, peak: 2, taper: 3 },
  12: { base: 2, build: 5, peak: 2, taper: 3 },
};

function raceKindFor(distanceKm: number): RaceKind {
  if (distanceKm >= 40) return 'M';
  if (distanceKm >= 15) return 'HM';
  if (distanceKm >= 7.5) return '10K';
  return '5K';
}

type QualityType = 'TEMPO' | 'INTERVALS' | 'REPETITIONS';

interface Layout {
  longRunDay: number;
  qualityDays: number[];
  easyDays: number[];
}

interface QualityWorkout {
  title: string;
  distanceKm: number;
  paceZone: PaceZone;
  steps: WorkoutStep[];
}

interface WeekBuildParams {
  weekStart: string;
  planStart: string;
  weekIndex: number;
  phaseWeek: number;
  km: number;
  phase: PlanPhase;
  qualities: QualityType[];
  layout: Layout;
  paces: PlanPaces | null;
  raceDate: string;
  raceDistanceKm: number;
  isRaceWeek: boolean;
  daysPerWeek: 3 | 4 | 5 | 6;
  experience: Experience;
  longKm: number;
  longFinish: boolean;
}

function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  return toIso(new Date(parseIso(iso).getTime() + days * MS_PER_DAY));
}

function dayDiff(from: string, to: string): number {
  return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / MS_PER_DAY);
}

function weekdayOf(iso: string): number {
  return (parseIso(iso).getUTCDay() + 6) % 7;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function fmtKm(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

function buildLayout(daysPerWeek: number, longRunDay: number, qualityCount: number): Layout {
  const forbidden = new Set([(longRunDay + 6) % 7, longRunDay, (longRunDay + 1) % 7]);
  const qualityDays: number[] = [];
  for (const offset of [2, 4, 5, 3]) {
    if (qualityDays.length >= qualityCount) break;
    const day = (longRunDay + offset) % 7;
    if (!forbidden.has(day) && !qualityDays.includes(day)) qualityDays.push(day);
  }
  const easyCount = Math.max(daysPerWeek - 1 - qualityDays.length, 0);
  const easyDays = [2, 4, 3, 5, 1, 0, 6]
    .filter((day) => day !== longRunDay && !qualityDays.includes(day))
    .slice(0, easyCount)
    .sort((a, b) => a - b);
  return { longRunDay, qualityDays: [...qualityDays].sort((a, b) => a - b), easyDays };
}

function raceWeekLayout(raceDate: string, daysPerWeek: number): Layout {
  const raceDay = weekdayOf(raceDate);
  const easyDays = [2, 4, 3, 5, 1, 0, 6]
    .filter((day) => day !== raceDay)
    .slice(0, Math.max(daysPerWeek - 1, 1))
    .sort((a, b) => a - b);
  return { longRunDay: -1, qualityDays: [], easyDays };
}

function qualityForWeek(phase: PlanPhase, buildWeekNumber: number, daysPerWeek: number): QualityType[] {
  if (phase !== 'BUILD' && phase !== 'PEAK') return [];
  const twoPerWeek = daysPerWeek >= 5;
  if (phase === 'PEAK') return twoPerWeek ? ['TEMPO', 'INTERVALS'] : ['TEMPO'];
  if (buildWeekNumber % 2 === 0) return twoPerWeek ? ['TEMPO', 'INTERVALS'] : ['TEMPO'];
  return twoPerWeek ? ['TEMPO', 'REPETITIONS'] : ['INTERVALS'];
}

interface SeriesParams {
  weeks: number;
  startKm: number;
  peakKm: number;
  longPeak: number;
  sharePeak: number;
  daysPerWeek: number;
}

function buildSeries(params: SeriesParams): { weeksKm: number[]; longKm: number[] } {
  const { weeks, startKm, peakKm, longPeak, sharePeak, daysPerWeek } = params;
  const nonTaper = Math.max(weeks - 3, 1);
  const peakIndex = Math.max(weeks - 4, 0);
  const maxStep = Math.max(daysPerWeek, 10);
  const shareStart = sharePeak - 0.08;
  const longStart = startKm * shareStart;

  const isCutback = (index: number): boolean => index > 0 && index < nonTaper && index !== peakIndex && index % 4 === 3;
  const growthSteps = (index: number): number => {
    let count = 0;
    for (let week = 0; week < index; week++) {
      if (week < nonTaper && !isCutback(week)) count += 1;
    }
    return count;
  };

  const stepsToPeak = growthSteps(peakIndex);
  const cappedLongPeak = stepsToPeak > 0 ? Math.min(longPeak, longStart + maxStep * stepsToPeak) : longStart;
  const deltaLong = stepsToPeak > 0 ? (cappedLongPeak - longStart) / stepsToPeak : 0;
  const deltaShare = stepsToPeak > 0 ? (sharePeak - shareStart) / stepsToPeak : 0;

  const weeksKm: number[] = [];
  const longKm: number[] = [];
  let lastGrowthKm = startKm;

  for (let week = 0; week < nonTaper; week++) {
    const progress = Math.min(growthSteps(week), stepsToPeak);
    const share = shareStart + deltaShare * progress;
    const lineLong = Math.min(longStart + deltaLong * progress, cappedLongPeak);
    const weekKm = Math.min(lineLong / share, peakKm, lastGrowthKm + maxStep);
    const longValue = Math.min(lineLong, weekKm * sharePeak);
    if (isCutback(week)) {
      weeksKm.push(round1(weekKm * 0.75));
      longKm.push(round1(longValue * 0.75));
      continue;
    }
    lastGrowthKm = weekKm;
    weeksKm.push(round1(weekKm));
    longKm.push(round1(longValue));
  }

  const peakWeek = Math.max(...weeksKm, startKm);
  const peakLong = Math.max(...longKm, MIN_LONG_KM);
  for (let week = nonTaper; week < weeks; week++) {
    const taperIndex = week - nonTaper;
    weeksKm.push(round1(peakWeek * (TAPER_VOLUME_FACTORS[taperIndex] ?? 0.4)));
    longKm.push(round1(peakLong * (TAPER_LONG_FACTORS[taperIndex] ?? 0)));
  }

  return { weeksKm, longKm };
}

function phaseOf(
  templateIndex: number,
  template: { base: number; build: number; peak: number; taper: number },
): PlanPhase {
  if (templateIndex < template.base) return 'BASE';
  if (templateIndex < template.base + template.build) return 'BUILD';
  if (templateIndex < template.base + template.build + template.peak) return 'PEAK';
  return 'TAPER';
}

function tempoWorkout(paces: PlanPaces, phase: PlanPhase): QualityWorkout {
  const minutes = phase === 'PEAK' ? 30 : 20;
  const durationSec = minutes * 60;
  const tempoKm = durationSec / paces.thresholdSecPerKm;
  return {
    title: `Tempo ${minutes} min`,
    distanceKm: round1(2 + tempoKm + 2),
    paceZone: 'T',
    steps: [
      { label: 'Zagrevanje 2 km', distanceKm: 2, pace: formatPace(paces.easyFastSecPerKm) },
      { label: `Tempo ${minutes} min`, durationSec, pace: formatPace(paces.thresholdSecPerKm) },
      { label: 'Hlađenje 2 km', distanceKm: 2, pace: formatPace(paces.easyFastSecPerKm) },
    ],
  };
}

function intervalsWorkout(paces: PlanPaces, phase: PlanPhase): QualityWorkout {
  const reps = phase === 'PEAK' ? 5 : 4;
  const steps: WorkoutStep[] = [
    { label: 'Zagrevanje 2 km', distanceKm: 2, pace: formatPace(paces.easyFastSecPerKm) },
    ...Array.from({ length: reps }, () => ({
      label: '1000 m @ I (400 m jog)',
      distanceKm: 1,
      pace: formatPace(paces.intervalSecPerKm),
    })),
    { label: 'Hlađenje 2 km', distanceKm: 2, pace: formatPace(paces.easyFastSecPerKm) },
  ];
  return { title: `Intervali ${reps}×1000 m`, distanceKm: round1(2 + reps * 1 + reps * 0.4 + 2), paceZone: 'I', steps };
}

function repetitionsWorkout(paces: PlanPaces): QualityWorkout {
  const steps: WorkoutStep[] = [
    { label: 'Zagrevanje 2 km', distanceKm: 2, pace: formatPace(paces.easyFastSecPerKm) },
    ...Array.from({ length: 8 }, () => ({
      label: '200 m @ R (200 m jog)',
      distanceKm: 0.2,
      pace: formatPace(paces.repetitionSecPerKm),
    })),
    { label: 'Hlađenje 1 km', distanceKm: 1, pace: formatPace(paces.easyFastSecPerKm) },
  ];
  return { title: 'Repeticije 8×200 m', distanceKm: 6.2, paceZone: 'R', steps };
}

function buildQuality(type: QualityType, paces: PlanPaces, phase: PlanPhase): QualityWorkout {
  if (type === 'TEMPO') return tempoWorkout(paces, phase);
  if (type === 'INTERVALS') return intervalsWorkout(paces, phase);
  return repetitionsWorkout(paces);
}

function easyWorkout(
  date: string,
  distanceKm: number,
  paces: PlanPaces | null,
  phase: PlanPhase,
  weekIndex: number,
): WorkoutDraft {
  return {
    date,
    type: 'EASY',
    title: `Lako trčanje ${fmtKm(distanceKm)} km`,
    distanceKm,
    durationSec: null,
    paceZone: 'E',
    steps: paces
      ? [{ label: 'E tempo', distanceKm, pace: formatPace(paces.easyFastSecPerKm) }]
      : [{ label: 'Lako trčanje', distanceKm }],
    phase,
    weekIndex,
  };
}

function longWorkout(
  date: string,
  distanceKm: number,
  paces: PlanPaces | null,
  phase: PlanPhase,
  weekIndex: number,
  finishAtMarathon: boolean,
): WorkoutDraft {
  const steps: WorkoutStep[] =
    finishAtMarathon && paces
      ? [
          { label: 'Dugi trk', distanceKm: round1(distanceKm - 3), pace: formatPace(paces.easyFastSecPerKm) },
          { label: 'Završnica M tempo 3 km', distanceKm: 3, pace: formatPace(paces.marathonSecPerKm) },
        ]
      : paces
        ? [{ label: 'Dugi trk', distanceKm, pace: formatPace(paces.easyFastSecPerKm) }]
        : [{ label: 'Dugi trk', distanceKm }];
  return {
    date,
    type: 'LONG',
    title: `Dugi trk ${fmtKm(distanceKm)} km`,
    distanceKm,
    durationSec: null,
    paceZone: 'E',
    steps,
    phase,
    weekIndex,
  };
}

function restWorkout(date: string, phase: PlanPhase, weekIndex: number): WorkoutDraft {
  return {
    date,
    type: 'REST',
    title: 'Odmor',
    distanceKm: 0,
    durationSec: null,
    paceZone: null,
    steps: [],
    phase,
    weekIndex,
  };
}

function raceWorkout(date: string, distanceKm: number, paces: PlanPaces | null, weekIndex: number): WorkoutDraft {
  const step: WorkoutStep = paces
    ? { label: `Trka ${fmtKm(distanceKm)} km`, distanceKm, pace: formatPace(paces.marathonSecPerKm) }
    : { label: `Trka ${fmtKm(distanceKm)} km`, distanceKm };
  return {
    date,
    type: 'RACE',
    title: 'TRKA',
    distanceKm,
    durationSec: null,
    paceZone: 'M',
    steps: [step],
    phase: 'RACE',
    weekIndex,
  };
}

function buildWeek(params: WeekBuildParams): WorkoutDraft[] {
  const layout = params.isRaceWeek ? raceWeekLayout(params.raceDate, params.daysPerWeek) : params.layout;
  const strengthByDate = new Map<string, WorkoutDraft>();
  if (!params.isRaceWeek && layout.longRunDay >= 0) {
    const drafts = strengthWorkoutsForWeek({
      weekStart: params.weekStart,
      weekIndex: params.weekIndex,
      phaseWeek: params.phaseWeek,
      phase: params.phase,
      daysPerWeek: params.daysPerWeek,
      longRunDay: layout.longRunDay,
      runDays: [...layout.qualityDays, ...layout.easyDays, layout.longRunDay],
      experience: params.experience,
      isRaceWeek: params.isRaceWeek,
      daysToRace: dayDiff(params.weekStart, params.raceDate),
    });
    for (const draft of drafts) strengthByDate.set(draft.date, draft);
  }
  const easyCount = layout.easyDays.length;
  const longKm = round1(Math.max(params.longKm, MIN_LONG_KM));
  const qualityList = params.paces
    ? params.qualities.map((type) => buildQuality(type, params.paces as PlanPaces, params.phase))
    : [];
  const qualityTotal = qualityList.reduce((sum, workout) => sum + workout.distanceKm, 0);

  const easyDistances: number[] = [];
  if (easyCount > 0) {
    if (params.isRaceWeek) {
      for (let i = 0; i < easyCount; i++)
        easyDistances.push(Math.max(2, round1((params.km - params.raceDistanceKm) / easyCount)));
    } else {
      const remainder = params.km - longKm - qualityTotal;
      for (let i = 0; i < easyCount; i++) easyDistances.push(Math.max(2, round1(remainder / easyCount)));
    }
  }

  const workouts: WorkoutDraft[] = [];
  let easyIndex = 0;
  let qualityIndex = 0;

  for (let day = 0; day < 7; day++) {
    const date = addDays(params.weekStart, day);
    if (date < params.planStart) continue;
    if (date > params.raceDate) break;
    const weekday = (weekdayOf(params.weekStart) + day) % 7;

    if (date === params.raceDate) {
      workouts.push(raceWorkout(date, params.raceDistanceKm, params.paces, params.weekIndex));
      continue;
    }
    if (weekday === layout.longRunDay) {
      workouts.push(longWorkout(date, longKm, params.paces, params.phase, params.weekIndex, params.longFinish));
      continue;
    }
    if (layout.qualityDays.includes(weekday) && qualityIndex < qualityList.length) {
      const quality = qualityList[qualityIndex];
      const type = params.qualities[qualityIndex];
      qualityIndex += 1;
      workouts.push({
        date,
        type,
        title: quality.title,
        distanceKm: quality.distanceKm,
        durationSec: null,
        paceZone: quality.paceZone,
        steps: quality.steps,
        phase: params.phase,
        weekIndex: params.weekIndex,
      });
      continue;
    }
    if (layout.easyDays.includes(weekday)) {
      const distanceKm = easyDistances[easyIndex] ?? 0;
      easyIndex += 1;
      workouts.push(easyWorkout(date, distanceKm, params.paces, params.phase, params.weekIndex));
      continue;
    }
    workouts.push(strengthByDate.get(date) ?? restWorkout(date, params.phase, params.weekIndex));
  }

  return workouts;
}

export function generatePlan(config: PlanConfig): PlanDraft {
  const totalDays = dayDiff(config.startDate, config.raceDate);
  if (totalDays <= 0) throw new Error('raceDate must be after startDate');

  const weeks = Math.floor(totalDays / 7) + 1;
  const raceDistanceKm = config.distanceKm ?? 42.195;
  const weekStartAt = (index: number): string => addDays(config.raceDate, -6 - 7 * (weeks - 1 - index));
  const anchor = config.anchor;
  const raceKind = raceKindFor(raceDistanceKm);
  const volume = RACE_VOLUME[raceKind][config.volumeBand];
  const baseMode = anchor === null || weeks < 12;
  const longPeak = baseMode
    ? Math.min(BASE_LONG_PEAK[raceKind], RACE_LONG_PEAK[raceKind][config.volumeBand])
    : RACE_LONG_PEAK[raceKind][config.volumeBand];
  const series = buildSeries({
    weeks,
    startKm: volume.start,
    peakKm: config.experience === 'first' ? Math.min(volume.peak, FIRST_PEAK_KM) : volume.peak,
    longPeak: config.experience === 'first' ? Math.min(longPeak, FIRST_LONG_KM) : longPeak,
    sharePeak: RACE_PEAK_SHARE[raceKind][config.volumeBand],
    daysPerWeek: config.daysPerWeek,
  });
  const paces = anchor ? pacesFromVdot(vdotFromPerformance(anchor.distanceKm, anchor.timeSec)) : null;

  if (baseMode) {
    const layout = buildLayout(config.daysPerWeek, config.longRunDay, 0);
    const workouts: WorkoutDraft[] = [];
    let phaseWeek = 0;
    let previousPhase: PlanPhase | null = null;
    for (let i = 0; i < weeks; i++) {
      const isRaceWeek = i === weeks - 1;
      const phase: PlanPhase = i >= weeks - 3 ? 'TAPER' : 'BASE';
      phaseWeek = phase === previousPhase ? phaseWeek + 1 : 0;
      previousPhase = phase;
      workouts.push(
        ...buildWeek({
          weekStart: weekStartAt(i),
          planStart: config.startDate,
          weekIndex: i,
          phaseWeek,
          km: series.weeksKm[i],
          phase,
          qualities: [],
          layout,
          paces,
          raceDate: config.raceDate,
          raceDistanceKm,
          isRaceWeek,
          daysPerWeek: config.daysPerWeek,
          experience: config.experience,
          longKm: series.longKm[i],
          longFinish: false,
        }),
      );
    }
    return { weeks, paces, anchor, workouts };
  }

  const templateKey = [18, 16, 14, 12].find((key) => key <= Math.min(weeks, 18)) ?? 12;
  const template = TEMPLATES[templateKey];
  const extraBase = weeks - templateKey;

  const workouts: WorkoutDraft[] = [];
  let phaseWeek = 0;
  let previousPhase: PlanPhase | null = null;
  for (let i = 0; i < weeks; i++) {
    const templateIndex = i - extraBase;
    const phase = i < extraBase ? 'BASE' : phaseOf(templateIndex, template);
    phaseWeek = phase === previousPhase ? phaseWeek + 1 : 0;
    previousPhase = phase;
    const buildWeekNumber = templateIndex - template.base;
    const qualities = qualityForWeek(phase, buildWeekNumber, config.daysPerWeek);
    const layout = buildLayout(config.daysPerWeek, config.longRunDay, qualities.length);
    const isRaceWeek = i === weeks - 1;
    const longFinish = (phase === 'BUILD' || phase === 'PEAK') && buildWeekNumber >= template.build - 3;
    workouts.push(
      ...buildWeek({
        weekStart: weekStartAt(i),
        planStart: config.startDate,
        weekIndex: i,
        phaseWeek,
        km: series.weeksKm[i],
        phase: isRaceWeek ? 'TAPER' : phase,
        qualities,
        layout,
        paces,
        raceDate: config.raceDate,
        raceDistanceKm,
        isRaceWeek,
        daysPerWeek: config.daysPerWeek,
        experience: config.experience,
        longKm: series.longKm[i],
        longFinish,
      }),
    );
  }

  return { weeks, paces, anchor, workouts };
}
