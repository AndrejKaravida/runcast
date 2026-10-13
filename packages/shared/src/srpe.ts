import type { Insight } from './coach';
import { addDays, dayDiff } from './dates';

export interface SrpeLog {
  rpe: number | null;
  log_date: string;
  duration_sec?: number | null;
}

export type LoadBand = 'insufficient' | 'low' | 'sweet' | 'caution' | 'high';

export interface LoadDay {
  date: string;
  load: number;
}

export interface TrainingLoad {
  days: LoadDay[];
  acute7: number;
  chronic28Weekly: number;
  acwr: number;
  band: LoadBand;
  sessions28: number;
}

export interface LoadInsight extends Insight {
  factor: number;
}

const LOAD_WEEKS = 8;
const ACUTE_DAYS = 7;
const CHRONIC_DAYS = 28;
const MIN_SESSIONS_28 = 8;
const MIN_SESSIONS_7 = 3;
const LOW_MAX = 0.8;
const SWEET_MAX = 1.3;
const CAUTION_MAX = 1.5;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function sessionLoad(rpe: number, durationSec: number): number {
  return round1((rpe * durationSec) / 60);
}

function bandFor(acwr: number, sessions28: number, sessions7: number): LoadBand {
  if (sessions28 < MIN_SESSIONS_28 || sessions7 < MIN_SESSIONS_7) return 'insufficient';
  if (acwr < LOW_MAX) return 'low';
  if (acwr <= SWEET_MAX) return 'sweet';
  if (acwr <= CAUTION_MAX) return 'caution';
  return 'high';
}

export function trainingLoad(logs: SrpeLog[], today: string): TrainingLoad {
  const loadByDate = new Map<string, number>();
  let sessions28 = 0;
  let sessions7 = 0;
  for (const log of logs) {
    if (log.rpe === null || log.rpe <= 0) continue;
    if (log.duration_sec === null || log.duration_sec === undefined || log.duration_sec <= 0) continue;
    const age = dayDiff(log.log_date, today);
    if (age < 0 || age >= LOAD_WEEKS * 7) continue;
    const load = sessionLoad(log.rpe, log.duration_sec);
    loadByDate.set(log.log_date, round1((loadByDate.get(log.log_date) ?? 0) + load));
    if (age < CHRONIC_DAYS) sessions28 += 1;
    if (age < ACUTE_DAYS) sessions7 += 1;
  }

  const days: LoadDay[] = [];
  for (let offset = LOAD_WEEKS * 7 - 1; offset >= 0; offset--) {
    const date = addDays(today, -offset);
    days.push({ date, load: loadByDate.get(date) ?? 0 });
  }

  const sumWindows = (daysBack: number): number =>
    round1(days.slice(-daysBack).reduce((sum, day) => sum + day.load, 0));
  const acute7 = sumWindows(ACUTE_DAYS);
  const chronic28Weekly = round1(sumWindows(CHRONIC_DAYS) / 4);
  const acwr = chronic28Weekly > 0 ? round1(acute7 / chronic28Weekly) : 0;

  return {
    days,
    acute7,
    chronic28Weekly,
    acwr,
    band: bandFor(acwr, sessions28, sessions7),
    sessions28,
  };
}

export function loadInsight(load: TrainingLoad): LoadInsight | null {
  if (load.band !== 'caution' && load.band !== 'high') return null;
  const caution = load.band === 'caution';
  return {
    id: caution ? 'load-caution' : 'load-high',
    tone: 'warning',
    titleKey: caution ? 'content:srpe.caution.title' : 'content:srpe.high.title',
    titleParams: { acwr: load.acwr },
    descriptionKey: caution ? 'content:srpe.caution.description' : 'content:srpe.high.description',
    actionLabelKey: caution ? 'stats:coach.actions.loadCaution' : 'stats:coach.actions.loadHigh',
    factor: caution ? 0.9 : 0.8,
  };
}
