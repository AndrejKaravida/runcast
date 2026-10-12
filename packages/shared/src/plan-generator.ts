import type {
  PaceZone,
  PlanConfig,
  PlanDraft,
  PlanPaces,
  PlanPhase,
  VolumeBand,
  WorkoutDraft,
  WorkoutStep,
} from './types';
import { formatPace, pacesFromVdot, vdotFromPerformance } from './vdot';

const MS_PER_DAY = 86_400_000;

const BAND_VOLUME: Record<VolumeBand, { start: number; peak: number }> = {
  lt20: { start: 15, peak: 40 },
  '20-40': { start: 28, peak: 60 },
  '40-60': { start: 38, peak: 78 },
  gt60: { start: 50, peak: 95 },
};

const TEMPLATES: Record<number, { base: number; build: number; peak: number; taper: number }> = {
  18: { base: 5, build: 8, peak: 2, taper: 3 },
  16: { base: 4, build: 7, peak: 2, taper: 3 },
  14: { base: 3, build: 6, peak: 2, taper: 3 },
  12: { base: 2, build: 5, peak: 2, taper: 3 },
};

const TAPER_FACTORS = [0.85, 0.7, 0.45];

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
  km: number;
  phase: PlanPhase;
  qualities: QualityType[];
  layout: Layout;
  paces: PlanPaces | null;
  raceDate: string;
  raceDistanceKm: number;
  isRaceWeek: boolean;
  daysPerWeek: number;
  longCap: number;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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

function rampWeeks(params: { totalWeeks: number; startKm: number; peakKm: number; daysPerWeek: number }): number[] {
  const { totalWeeks, startKm, peakKm, daysPerWeek } = params;
  const nonTaper = Math.max(totalWeeks - 3, 1);
  const maxStep = Math.max(daysPerWeek, 10);
  const result: number[] = [];
  let lastGrowthValue = startKm;
  for (let i = 0; i < totalWeeks; i++) {
    if (i >= nonTaper) {
      const taperFactor = TAPER_FACTORS[i - nonTaper] ?? TAPER_FACTORS[2];
      result.push(round1(Math.max(...result, startKm) * taperFactor));
      continue;
    }
    const line = nonTaper <= 1 ? startKm : startKm + ((peakKm - startKm) * i) / (nonTaper - 1);
    const clampable = Math.min(line, peakKm, lastGrowthValue + maxStep);
    if (i > 0 && i % 4 === 3) {
      result.push(round1(clampable * 0.75));
      continue;
    }
    lastGrowthValue = clampable;
    result.push(round1(clampable));
  }
  return result;
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
  const easyCount = layout.easyDays.length;
  const longKm = round1(clamp(params.km * 0.32, 5, params.longCap));
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
    workouts.push(restWorkout(date, params.phase, params.weekIndex));
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
  const band = BAND_VOLUME[config.volumeBand];
  const peakCap = config.experience === 'first' ? Math.min(band.peak, 55) : band.peak;
  const paces = anchor ? pacesFromVdot(vdotFromPerformance(anchor.distanceKm, anchor.timeSec)) : null;

  if (anchor === null || weeks < 12) {
    const weeksKm = rampWeeks({
      totalWeeks: weeks,
      startKm: band.start,
      peakKm: peakCap,
      daysPerWeek: config.daysPerWeek,
    });
    const layout = buildLayout(config.daysPerWeek, config.longRunDay, 0);
    const workouts: WorkoutDraft[] = [];
    for (let i = 0; i < weeks; i++) {
      const isRaceWeek = i === weeks - 1;
      const phase: PlanPhase = i >= weeks - 3 ? 'TAPER' : 'BASE';
      workouts.push(
        ...buildWeek({
          weekStart: weekStartAt(i),
          planStart: config.startDate,
          weekIndex: i,
          km: weeksKm[i],
          phase,
          qualities: [],
          layout,
          paces,
          raceDate: config.raceDate,
          raceDistanceKm,
          isRaceWeek,
          daysPerWeek: config.daysPerWeek,
          longCap: 28,
          longFinish: false,
        }),
      );
    }
    return { weeks, paces, anchor, workouts };
  }

  const templateKey = [18, 16, 14, 12].find((key) => key <= Math.min(weeks, 18)) ?? 12;
  const template = TEMPLATES[templateKey];
  const extraBase = weeks - templateKey;
  const weeksKm = rampWeeks({
    totalWeeks: weeks,
    startKm: band.start,
    peakKm: peakCap,
    daysPerWeek: config.daysPerWeek,
  });

  const workouts: WorkoutDraft[] = [];
  for (let i = 0; i < weeks; i++) {
    const templateIndex = i - extraBase;
    const phase = i < extraBase ? 'BASE' : phaseOf(templateIndex, template);
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
        km: weeksKm[i],
        phase: isRaceWeek ? 'TAPER' : phase,
        qualities,
        layout,
        paces,
        raceDate: config.raceDate,
        raceDistanceKm,
        isRaceWeek,
        daysPerWeek: config.daysPerWeek,
        longCap: 32,
        longFinish,
      }),
    );
  }

  return { weeks, paces, anchor, workouts };
}
