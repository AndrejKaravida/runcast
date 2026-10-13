import { parsePaceLabel } from './guided';
import type { PlanPaces, WorkoutStep } from './types';

export interface TcxWorkout {
  date: string;
  title: string;
  distanceKm: number;
  durationSec: number | null;
  steps: WorkoutStep[];
}

export interface TcxBuildInput {
  workout: TcxWorkout;
  paces?: PlanPaces | null;
}

export interface TcxSpeedZone {
  minSpeed: number;
  maxSpeed: number;
}

const SPEED_ZONE_TOLERANCE = 0.05;
const DEFAULT_PACE_SEC_PER_KM = 360;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function paceToSpeedMps(pace?: string | null): number | null {
  const secPerKm = parsePaceLabel(pace ?? undefined);
  if (secPerKm === null || secPerKm <= 0) return null;
  return 1000 / secPerKm;
}

export function paceSpeedZone(pace?: string | null): TcxSpeedZone | null {
  const speed = paceToSpeedMps(pace);
  if (speed === null) return null;
  return {
    minSpeed: speed * (1 - SPEED_ZONE_TOLERANCE),
    maxSpeed: speed * (1 + SPEED_ZONE_TOLERANCE),
  };
}

interface TcxLap {
  label: string;
  intensity: 'Active' | 'Rest';
  timeSec: number | null;
  distanceMeters: number | null;
  zone: TcxSpeedZone | null;
}

function formatSpeed(value: number): string {
  return String(Math.round(value * 10000) / 10000);
}

function stepLap(step: WorkoutStep): TcxLap {
  const label = step.label ?? '';
  const paceSecPerKm = parsePaceLabel(step.pace);
  const distanceKm = step.distanceKm && step.distanceKm > 0 ? step.distanceKm : null;
  const durationSec = step.durationSec && step.durationSec > 0 ? step.durationSec : null;
  const distanceMeters = distanceKm === null ? null : Math.round(distanceKm * 1000);
  const timeSec =
    durationSec !== null
      ? Math.round(durationSec)
      : distanceKm !== null && paceSecPerKm !== null
        ? Math.round(distanceKm * paceSecPerKm)
        : null;
  return {
    label,
    intensity: /\bjog\b/i.test(label) ? 'Rest' : 'Active',
    timeSec,
    distanceMeters,
    zone: paceSpeedZone(step.pace),
  };
}

function fallbackLap(workout: TcxWorkout, paces: PlanPaces | null): TcxLap {
  const distanceMeters = workout.distanceKm > 0 ? Math.round(workout.distanceKm * 1000) : null;
  const paceSecPerKm = paces?.easySlowSecPerKm ?? DEFAULT_PACE_SEC_PER_KM;
  const timeSec =
    workout.durationSec && workout.durationSec > 0
      ? Math.round(workout.durationSec)
      : distanceMeters !== null
        ? Math.round(workout.distanceKm * paceSecPerKm)
        : null;
  return {
    label: workout.title,
    intensity: 'Active',
    timeSec,
    distanceMeters,
    zone: null,
  };
}

export function buildWorkoutTcx({ workout, paces = null }: TcxBuildInput): string {
  const laps = workout.steps.length > 0 ? workout.steps.map(stepLap) : [fallbackLap(workout, paces)];
  const startMs = Date.parse(`${workout.date}T00:00:00Z`);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">',
    '  <Activities>',
    '    <Activity Sport="Running">',
    `      <Id>${workout.date}T00:00:00Z</Id>`,
  ];
  let cursorSec = 0;
  laps.forEach((lap, index) => {
    const startTime = `${new Date(startMs + cursorSec * 1000).toISOString().slice(0, 19)}Z`;
    lines.push(`      <Lap StartTime="${startTime}" Order="${index + 1}">`);
    if (lap.timeSec !== null) lines.push(`        <TotalTimeSeconds>${lap.timeSec}</TotalTimeSeconds>`);
    if (lap.distanceMeters !== null) lines.push(`        <DistanceMeters>${lap.distanceMeters}</DistanceMeters>`);
    lines.push(`        <Intensity>${lap.intensity}</Intensity>`);
    if (lap.zone) {
      lines.push(
        '        <Target>',
        '          <Speed>',
        '            <SpeedZone>',
        `              <MinSpeed>${formatSpeed(lap.zone.minSpeed)}</MinSpeed>`,
        `              <MaxSpeed>${formatSpeed(lap.zone.maxSpeed)}</MaxSpeed>`,
        '            </SpeedZone>',
        '          </Speed>',
        '        </Target>',
      );
    }
    lines.push(`        <Notes>${escapeXml(lap.label)}</Notes>`, '      </Lap>');
    cursorSec += lap.timeSec ?? 0;
  });
  lines.push('    </Activity>', '  </Activities>', '</TrainingCenterDatabase>');
  return `${lines.join('\n')}\n`;
}
