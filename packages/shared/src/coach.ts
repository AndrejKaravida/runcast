export type InsightTone = 'positive' | 'warning' | 'neutral';

export interface InsightAction {
  kind: 'scale-week';
  weekStart: string;
  factor: number;
}

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  description: string;
  action?: InsightAction;
}

export interface WeeklyRecap {
  weekStart: string;
  plannedKm: number;
  doneKm: number;
  plannedSessions: number;
  doneSessions: number;
  longestKm: number;
  adherencePct: number;
}

export interface CoachWorkout {
  id: string;
  type: string;
  workout_date: string;
  distance_km: number;
  status: string;
}

export interface CoachLog {
  rpe: number | null;
  log_date: string;
  distance_km: number | null;
}

export interface CoachInput {
  workouts: CoachWorkout[];
  logs: CoachLog[];
  today: string;
  plan: { raceDate: string };
}

export interface CoachResult {
  insights: Insight[];
  recap: WeeklyRecap;
}

const RUN_TYPES = ['EASY', 'LONG', 'TEMPO', 'INTERVALS', 'REPETITIONS'];
const MISSED_DAYS = 14;
const MISSED_MIN = 2;
const RPE_WINDOW = 5;
const RPE_HIGH = 8.5;
const RPE_DRIFT = 7.5;
const RPE_LOW = 6;
const ADHERENCE_MIN = 90;
const MIN_RPE_LOGS = 3;
const MIN_PLANNED = 3;
const MAX_INSIGHTS = 3;
const MS_PER_DAY = 86_400_000;

export const SCALE_FACTOR_MIN = 0.6;
export const SCALE_FACTOR_MAX = 1.15;

function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  return toIso(new Date(parseIso(iso).getTime() + days * MS_PER_DAY));
}

function weekdayIndex(iso: string): number {
  return (parseIso(iso).getUTCDay() + 6) % 7;
}

function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function fmtNumber(value: number): string {
  return String(value).replace('.', ',');
}

export function clampScaleFactor(factor: number): number {
  return clamp(factor, SCALE_FACTOR_MIN, SCALE_FACTOR_MAX);
}

function isRun(workout: CoachWorkout): boolean {
  return RUN_TYPES.includes(workout.type);
}

function recentRpe(logs: CoachLog[], today: string): { avg: number; count: number } {
  const rated = logs
    .filter((log) => log.rpe !== null && log.rpe > 0 && log.log_date <= today)
    .sort((a, b) => b.log_date.localeCompare(a.log_date))
    .slice(0, RPE_WINDOW);
  if (rated.length === 0) return { avg: 0, count: 0 };
  const sum = rated.reduce((total, log) => total + (log.rpe as number), 0);
  return { avg: round1(sum / rated.length), count: rated.length };
}

function buildRecap(workouts: CoachWorkout[], today: string): WeeklyRecap {
  const weekStart = addDays(startOfWeek(today), -7);
  const weekEnd = addDays(weekStart, 6);
  const runs = workouts.filter(
    (workout) => isRun(workout) && workout.workout_date >= weekStart && workout.workout_date <= weekEnd,
  );
  const done = runs.filter((workout) => workout.status === 'DONE');
  return {
    weekStart,
    plannedKm: round1(runs.reduce((sum, workout) => sum + workout.distance_km, 0)),
    doneKm: round1(done.reduce((sum, workout) => sum + workout.distance_km, 0)),
    plannedSessions: runs.length,
    doneSessions: done.length,
    longestKm: done.reduce((max, workout) => Math.max(max, workout.distance_km), 0),
    adherencePct: runs.length === 0 ? 0 : Math.round((done.length / runs.length) * 100),
  };
}

function buildAction(params: {
  weekStart: string;
  factor: number;
  today: string;
  raceDate: string;
  workouts: CoachWorkout[];
}): InsightAction | undefined {
  const { weekStart, factor, today, raceDate, workouts } = params;
  if (weekStart > raceDate) return undefined;
  const weekEnd = addDays(weekStart, 6);
  const week = workouts.filter((workout) => workout.workout_date >= weekStart && workout.workout_date <= weekEnd);
  if (week.some((workout) => workout.type === 'RACE')) return undefined;
  const scalable = week.some(
    (workout) => workout.status === 'PLANNED' && isRun(workout) && workout.workout_date >= today,
  );
  if (!scalable) return undefined;
  return { kind: 'scale-week', weekStart, factor: clampScaleFactor(factor) };
}

export function buildCoachInsights(input: CoachInput): CoachResult {
  const { workouts, logs, today, plan } = input;
  const recap = buildRecap(workouts, today);
  const weekStart = addDays(startOfWeek(today), 7);
  const action = (factor: number): InsightAction | undefined =>
    buildAction({ weekStart, factor, today, raceDate: plan.raceDate, workouts });
  const recent = recentRpe(logs, today);
  const insights: Insight[] = [];

  const missed = workouts.filter(
    (workout) =>
      isRun(workout) &&
      workout.status !== 'DONE' &&
      workout.workout_date >= addDays(today, -MISSED_DAYS) &&
      workout.workout_date <= addDays(today, -1),
  ).length;

  const lastWeekStart = addDays(startOfWeek(today), -7);
  const longMissed = workouts.some(
    (workout) =>
      workout.type === 'LONG' &&
      workout.status !== 'DONE' &&
      workout.workout_date >= lastWeekStart &&
      workout.workout_date <= addDays(lastWeekStart, 6),
  );

  if (missed >= MISSED_MIN) {
    insights.push({
      id: 'missed-runs',
      tone: 'warning',
      title: `Propustio si ${missed} treninga u poslednje dve nedelje`,
      description: 'Sledeća nedelja je lakša da se vratiš u ritam.',
      action: action(0.8),
    });
  } else if (recent.avg >= RPE_HIGH) {
    insights.push({
      id: 'high-rpe',
      tone: 'warning',
      title: `RPE je visok (prosek ${fmtNumber(recent.avg)})`,
      description: 'Poslednjih pet treninga traži mnogo od tebe. Uzimamo korak nazad.',
      action: action(0.9),
    });
  } else if (recent.count >= MIN_RPE_LOGS && recent.avg >= RPE_DRIFT) {
    insights.push({
      id: 'rpe-drift',
      tone: 'neutral',
      title: `RPE blago raste (prosek ${fmtNumber(recent.avg)})`,
      description: 'Volumen ostaje isti dok se ne stabilizuje.',
      action: action(1),
    });
  }

  if (longMissed) {
    insights.push({
      id: 'long-run-missed',
      tone: 'neutral',
      title: 'Dugi trk nije ispunjen',
      description: 'Prošle nedelje dugi trk je izostao. Ne nadoknađujemo kilometre — sledeća nedelja ostaje po planu.',
      action: action(1),
    });
  }

  const windowRuns = workouts.filter(
    (workout) =>
      isRun(workout) &&
      workout.workout_date >= addDays(today, -MISSED_DAYS) &&
      workout.workout_date <= addDays(today, -1),
  );
  const doneCount = windowRuns.filter((workout) => workout.status === 'DONE').length;
  const adherence = windowRuns.length === 0 ? 0 : Math.round((doneCount / windowRuns.length) * 100);
  const hasEarlierInsight = insights.some((insight) => insight.id !== 'long-run-missed');

  if (
    !hasEarlierInsight &&
    windowRuns.length >= MIN_PLANNED &&
    adherence >= ADHERENCE_MIN &&
    recent.count >= MIN_RPE_LOGS &&
    recent.avg <= RPE_LOW
  ) {
    insights.push({
      id: 'ready-to-build',
      tone: 'positive',
      title: 'Sve po planu — možeš malo više',
      description: `Realizacija ${adherence}% i nizak RPE (prosek ${fmtNumber(recent.avg)}). Sledeća nedelja ide +10%.`,
      action: action(1.1),
    });
  }

  return { insights: insights.slice(0, MAX_INSIGHTS), recap };
}
