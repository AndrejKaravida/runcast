import type { Experience, PlanPhase, WorkoutDraft, WorkoutStep } from './types';
import { addDays, weekdayOf } from './dates';

export interface StrengthWeekInput {
  weekStart: string;
  weekIndex: number;
  phaseWeek: number;
  phase: PlanPhase;
  daysPerWeek: 3 | 4 | 5 | 6;
  longRunDay: number;
  runDays: number[];
  experience: Experience;
  isRaceWeek: boolean;
  daysToRace: number;
}

type TemplateId = 'A' | 'B' | 'MAINTENANCE' | 'MOBILITY';

interface Exercise {
  label: string;
  sets: number | null;
  reps: string | null;
  durationSec: number;
}

const TEMPLATE_TITLES: Record<TemplateId, string> = {
  A: 'Snaga A: noge i core',
  B: 'Snaga B: glute i core',
  MAINTENANCE: 'Snaga: održavanje',
  MOBILITY: 'Mobilnost 20 min',
};

const BASE_TEMPLATES: TemplateId[] = ['A', 'MOBILITY'];
const BUILD_TEMPLATES: TemplateId[] = ['A', 'B'];
const PEAK_TEMPLATES: TemplateId[] = ['MAINTENANCE', 'MOBILITY'];
const TAPER_TEMPLATES: TemplateId[] = ['MOBILITY'];

const WARMUP_SEC = 300;
const COOLDOWN_SEC = 300;
const STRENGTH_STEP_SEC = 150;
const CORE_STEP_SEC = 90;
const PLYO_STEP_SEC = 60;
const TAPER_MIN_DAYS = 10;

export function strengthDaysFor(input: StrengthWeekInput): number[] {
  if (input.isRaceWeek || input.phase === 'RACE') return [];
  const target = input.phase === 'TAPER' ? 1 : 2;
  if (input.phase === 'TAPER' && input.daysToRace < TAPER_MIN_DAYS) return [];
  const blocked = new Set<number>([...input.runDays, (input.longRunDay + 6) % 7]);
  const candidates = [0, 1, 2, 3, 4, 5, 6].filter((day) => !blocked.has(day));
  const chosen: number[] = [];
  for (const day of candidates) {
    if (chosen.length >= target) break;
    if (chosen.some((picked) => Math.abs(picked - day) === 1)) continue;
    chosen.push(day);
  }
  for (const day of candidates) {
    if (chosen.length >= target) break;
    if (!chosen.includes(day)) chosen.push(day);
  }
  return chosen.sort((a, b) => a - b);
}

function setsFor(input: StrengthWeekInput): { sets: number; reps: string } {
  if (input.phase === 'PEAK') return { sets: 2, reps: '12' };
  if (input.phase === 'BUILD') {
    if (input.phaseWeek >= 1) {
      return input.experience === 'experienced' ? { sets: 4, reps: '8' } : { sets: 3, reps: '12' };
    }
    return { sets: 3, reps: '10' };
  }
  return { sets: 3, reps: input.phaseWeek === 0 ? '10' : '12' };
}

function exercisesFor(template: TemplateId, input: StrengthWeekInput): Exercise[] {
  if (template === 'MOBILITY') {
    return [
      { label: 'Zagrevanje 3 min', sets: null, reps: null, durationSec: 180 },
      { label: 'Kukovi i skočni zglobovi 4 min', sets: null, reps: null, durationSec: 240 },
      { label: 'Zadnja loža i listovi 3 min', sets: null, reps: null, durationSec: 180 },
      { label: 'Kuk fleksori i glutei 3 min', sets: null, reps: null, durationSec: 180 },
      { label: 'Torakalna rotacija 3 min', sets: null, reps: null, durationSec: 180 },
      { label: 'Disanje i opuštanje 4 min', sets: null, reps: null, durationSec: 240 },
    ];
  }
  if (template === 'MAINTENANCE') {
    return [
      { label: 'Zagrevanje 5 min', sets: null, reps: null, durationSec: WARMUP_SEC },
      { label: 'Čučnjevi', sets: 2, reps: '12', durationSec: STRENGTH_STEP_SEC },
      { label: 'Mrtvo dizanje na jednoj nozi', sets: 2, reps: '12 (svaka noga)', durationSec: STRENGTH_STEP_SEC },
      { label: 'Glute most', sets: 2, reps: '12', durationSec: STRENGTH_STEP_SEC },
      { label: 'Plank', sets: 2, reps: '45 s', durationSec: CORE_STEP_SEC },
      { label: 'Bird dog', sets: 2, reps: '10', durationSec: CORE_STEP_SEC },
      { label: 'Hlađenje i mobilnost 5 min', sets: null, reps: null, durationSec: COOLDOWN_SEC },
    ];
  }
  const { sets, reps } = setsFor(input);
  if (template === 'A') {
    const plyo: Exercise[] =
      input.phase === 'BUILD' && input.experience === 'experienced'
        ? [{ label: 'Poskoci', sets: 3, reps: '10', durationSec: PLYO_STEP_SEC }]
        : [];
    return [
      { label: 'Zagrevanje 5 min', sets: null, reps: null, durationSec: WARMUP_SEC },
      { label: 'Čučnjevi', sets, reps, durationSec: STRENGTH_STEP_SEC },
      { label: 'Iskorak', sets, reps: `${reps} (svaka noga)`, durationSec: STRENGTH_STEP_SEC },
      { label: 'Glute most', sets, reps, durationSec: STRENGTH_STEP_SEC },
      { label: 'Plank', sets: 3, reps: '45 s', durationSec: CORE_STEP_SEC },
      { label: 'Dead bug', sets: 3, reps: '10', durationSec: CORE_STEP_SEC },
      ...plyo,
      { label: 'Hlađenje i mobilnost 5 min', sets: null, reps: null, durationSec: COOLDOWN_SEC },
    ];
  }
  return [
    { label: 'Zagrevanje 5 min', sets: null, reps: null, durationSec: WARMUP_SEC },
    { label: 'Mrtvo dizanje na jednoj nozi', sets, reps: `${reps} (svaka noga)`, durationSec: STRENGTH_STEP_SEC },
    { label: 'Bugarski čučanj', sets, reps: `${reps} (svaka noga)`, durationSec: STRENGTH_STEP_SEC },
    { label: 'Podizanje na prste', sets: 3, reps: '15', durationSec: STRENGTH_STEP_SEC },
    { label: 'Glute most', sets, reps, durationSec: STRENGTH_STEP_SEC },
    { label: 'Plank', sets: 3, reps: '45 s', durationSec: CORE_STEP_SEC },
    { label: 'Bird dog', sets: 3, reps: '10', durationSec: CORE_STEP_SEC },
    { label: 'Hlađenje i mobilnost 5 min', sets: null, reps: null, durationSec: COOLDOWN_SEC },
  ];
}

function toStep(exercise: Exercise): WorkoutStep {
  if (exercise.sets === null || exercise.reps === null) {
    return { label: exercise.label, durationSec: exercise.durationSec };
  }
  return { label: `${exercise.label} ${exercise.sets}×${exercise.reps}`, durationSec: exercise.durationSec };
}

function templatesFor(input: StrengthWeekInput): TemplateId[] {
  if (input.phase === 'TAPER' || input.phase === 'RACE') return TAPER_TEMPLATES;
  if (input.phase === 'PEAK') return PEAK_TEMPLATES;
  if (input.phase === 'BUILD') return BUILD_TEMPLATES;
  return BASE_TEMPLATES;
}

export function strengthWorkoutsForWeek(input: StrengthWeekInput): WorkoutDraft[] {
  const days = strengthDaysFor(input);
  if (days.length === 0) return [];
  const templates = templatesFor(input).slice(0, days.length);
  const startWeekday = weekdayOf(input.weekStart);
  return days.map((day, index) => {
    const date = addDays(input.weekStart, (day - startWeekday + 7) % 7);
    const steps = exercisesFor(templates[index], input).map(toStep);
    return {
      date,
      type: 'STRENGTH',
      title: TEMPLATE_TITLES[templates[index]],
      distanceKm: 0,
      durationSec: steps.reduce((sum, step) => sum + (step.durationSec ?? 0), 0),
      paceZone: null,
      steps,
      phase: input.phase,
      weekIndex: input.weekIndex,
    };
  });
}
