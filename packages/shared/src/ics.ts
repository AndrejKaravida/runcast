import type { PlanPaces, RunWindow, WorkoutStep, WorkoutType } from './types';
import { formatDuration } from './vdot';

export interface IcsEvent {
  uid: string;
  date: string;
  startHour: number;
  durationMinutes: number;
  summary: string;
  description: string;
}

export interface IcsWorkout {
  id: string;
  date: string;
  type: WorkoutType;
  title: string;
  distanceKm: number;
  durationSec: number | null;
  steps: WorkoutStep[];
}

export const RUN_WINDOW_START_HOUR: Record<RunWindow, number> = {
  morning: 7,
  evening: 18,
  flexible: 9,
};

const DEFAULT_PROD_ID = '-//RunCast//Plan Export 1.0//SR';
const DEFAULT_PACE_SEC_PER_KM = 360;
const encoder = new TextEncoder();

export function escapeIcsText(value: string): string {
  return value
    .replace(/\r\n|\r/g, '\n')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function foldIcsLine(line: string, maxOctets = 75): string {
  if (encoder.encode(line).length <= maxOctets) return line;
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (octets + size > maxOctets) {
      parts.push(current);
      current = ' ';
      octets = 1;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join('\r\n');
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function localDateTime(iso: string, hour: number, minute: number): string {
  return `${iso.replace(/-/g, '')}T${pad(hour)}${pad(minute)}00`;
}

function addMinutes(iso: string, hour: number, minutes: number): string {
  const end = new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + hour * 3_600_000 + minutes * 60_000);
  return localDateTime(end.toISOString().slice(0, 10), end.getUTCHours(), end.getUTCMinutes());
}

function utcStamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
}

export function buildIcs(events: IcsEvent[], options: { prodId?: string; now?: Date } = {}): string {
  const stamp = utcStamp(options.now ?? new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:${options.prodId ?? DEFAULT_PROD_ID}`];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${localDateTime(event.date, event.startHour, 0)}`,
      `DTEND:${addMinutes(event.date, event.startHour, event.durationMinutes)}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map((line) => foldIcsLine(line)).join('\r\n')}\r\n`;
}

function stepLine(step: WorkoutStep, index: number): string {
  const parts = [step.label];
  if (step.distanceKm) parts.push(`${step.distanceKm} km`);
  if (step.pace) parts.push(`${step.pace} /km`);
  if (step.durationSec) parts.push(formatDuration(step.durationSec));
  return `${index + 1}. ${parts.join(' · ')}`;
}

function eventDurationSec(workout: IcsWorkout, paces: PlanPaces | null): number {
  if (workout.durationSec) return workout.durationSec;
  const stepSeconds = workout.steps.reduce((sum, step) => sum + (step.durationSec ?? 0), 0);
  if (stepSeconds > 0) return stepSeconds;
  return workout.distanceKm * (paces?.easySlowSecPerKm ?? DEFAULT_PACE_SEC_PER_KM);
}

export function buildPlanEvents(
  workouts: IcsWorkout[],
  options: { runWindow: RunWindow; paces?: PlanPaces | null },
): IcsEvent[] {
  const startHour = RUN_WINDOW_START_HOUR[options.runWindow];
  const paces = options.paces ?? null;
  return workouts
    .filter((workout) => workout.type !== 'REST')
    .map((workout) => {
      const steps = workout.steps.map(stepLine);
      return {
        uid: `workout-${workout.id}@runcast.app`,
        date: workout.date,
        startHour,
        durationMinutes: Math.max(1, Math.round(eventDurationSec(workout, paces) / 60)),
        summary: workout.title,
        description: [workout.title, steps.length > 0 ? steps.join('\n') : null, 'RunCast plan']
          .filter((part): part is string => part !== null)
          .join('\n\n'),
      };
    });
}

export function buildGoogleCalendarUrl(event: IcsEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.summary,
    dates: `${localDateTime(event.date, event.startHour, 0)}/${addMinutes(event.date, event.startHour, event.durationMinutes)}`,
    details: event.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
