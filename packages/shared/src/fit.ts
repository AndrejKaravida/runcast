import { DEFAULT_PACE_SEC_PER_KM } from './guided';
import { paceToSpeedMps } from './tcx';
import type { PlanPaces, WorkoutStep } from './types';

export interface FitWorkout {
  date: string;
  title: string;
  distanceKm: number;
  durationSec: number | null;
  steps: WorkoutStep[];
}

export interface FitBuildInput {
  workout: FitWorkout;
  paces?: PlanPaces | null;
  startAt?: string;
}

interface FitFieldDefinition {
  number: number;
  size: number;
  baseType: number;
}

interface FitStep {
  durationType: number;
  durationValue: number;
  targetType: number;
  targetLow: number;
  targetHigh: number;
  intensity: number;
}

const HEADER_SIZE = 12;
const PROTOCOL_VERSION = 0x10;
const PROFILE_VERSION = 2199;
const FIT_EPOCH_OFFSET_SECONDS = 631065600;
const WKT_NAME_SIZE = 16;

const FILE_ID_MESSAGE = 0;
const WORKOUT_MESSAGE = 26;
const WORKOUT_STEP_MESSAGE = 27;

const LOCAL_FILE_ID = 0;
const LOCAL_WORKOUT = 1;
const LOCAL_WORKOUT_STEP = 2;

const BASE_ENUM = 0x00;
const BASE_STRING = 0x07;
const BASE_UINT16 = 0x84;
const BASE_UINT32 = 0x86;

const FILE_TYPE_WORKOUT = 5;
const MANUFACTURER_DEVELOPMENT = 255;
const WORKOUT_SPORT_RUNNING = 1;

const DURATION_TIME = 0;
const DURATION_DISTANCE = 1;

const TARGET_SPEED = 0;
const TARGET_OPEN = 2;

const INTENSITY_ACTIVE = 0;
const INTENSITY_REST = 1;
const INTENSITY_WARMUP = 2;
const INTENSITY_COOLDOWN = 3;

const WARMUP_LABEL = /\b(zagrevanje|warm.?up)\b/i;
const COOLDOWN_LABEL = /\b(hlađenje|hladenje|cool.?down)\b/i;
const REST_LABEL = /\b(jog|pauza|odmor|rest|recovery)\b/i;

const FILE_ID_FIELDS: FitFieldDefinition[] = [
  { number: 0, size: 1, baseType: BASE_ENUM },
  { number: 1, size: 2, baseType: BASE_UINT16 },
  { number: 4, size: 4, baseType: BASE_UINT32 },
];

const WORKOUT_FIELDS: FitFieldDefinition[] = [
  { number: 4, size: 1, baseType: BASE_ENUM },
  { number: 6, size: 2, baseType: BASE_UINT16 },
  { number: 8, size: WKT_NAME_SIZE, baseType: BASE_STRING },
];

const WORKOUT_STEP_FIELDS: FitFieldDefinition[] = [
  { number: 254, size: 2, baseType: BASE_UINT16 },
  { number: 1, size: 1, baseType: BASE_ENUM },
  { number: 2, size: 4, baseType: BASE_UINT32 },
  { number: 3, size: 1, baseType: BASE_ENUM },
  { number: 5, size: 4, baseType: BASE_UINT32 },
  { number: 6, size: 4, baseType: BASE_UINT32 },
  { number: 7, size: 1, baseType: BASE_ENUM },
];

const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01,
  0x8801, 0x4400,
];

function fitCrc(bytes: readonly number[]): number {
  let crc = 0;
  for (const byte of bytes) {
    let tableValue = CRC_TABLE[crc & 0x0f];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tableValue ^ CRC_TABLE[byte & 0x0f];
    tableValue = CRC_TABLE[crc & 0x0f];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tableValue ^ CRC_TABLE[(byte >> 4) & 0x0f];
  }
  return crc;
}

function fitTimestamp(instant: string): number {
  const milliseconds = Date.parse(instant);
  if (Number.isNaN(milliseconds)) return 0;
  return Math.max(0, Math.round(milliseconds / 1000) - FIT_EPOCH_OFFSET_SECONDS);
}

function stepIntensity(label: string): number {
  if (WARMUP_LABEL.test(label)) return INTENSITY_WARMUP;
  if (COOLDOWN_LABEL.test(label)) return INTENSITY_COOLDOWN;
  if (REST_LABEL.test(label)) return INTENSITY_REST;
  return INTENSITY_ACTIVE;
}

function paceTarget(pace?: string | null): Pick<FitStep, 'targetType' | 'targetLow' | 'targetHigh'> {
  const speed = paceToSpeedMps(pace);
  if (speed === null) return { targetType: TARGET_OPEN, targetLow: 0, targetHigh: 0 };
  const millimetersPerSecond = Math.round(speed * 1000);
  return { targetType: TARGET_SPEED, targetLow: millimetersPerSecond, targetHigh: millimetersPerSecond };
}

function resolveStep(step: WorkoutStep): FitStep {
  const durationSec = step.durationSec && step.durationSec > 0 ? Math.round(step.durationSec) : null;
  const distanceCm = step.distanceKm && step.distanceKm > 0 ? Math.round(step.distanceKm * 100000) : null;
  const target = paceTarget(step.pace);
  const intensity = stepIntensity(step.label);
  if (durationSec !== null) {
    return { durationType: DURATION_TIME, durationValue: durationSec * 1000, ...target, intensity };
  }
  if (distanceCm !== null) {
    return { durationType: DURATION_DISTANCE, durationValue: distanceCm, ...target, intensity };
  }
  return { durationType: DURATION_TIME, durationValue: 0, ...target, intensity };
}

function fallbackStep(workout: FitWorkout, paces: PlanPaces | null): FitStep {
  const durationSec = workout.durationSec && workout.durationSec > 0 ? Math.round(workout.durationSec) : null;
  const distanceCm = workout.distanceKm > 0 ? Math.round(workout.distanceKm * 100000) : null;
  const paceSecPerKm = paces?.easySlowSecPerKm ?? DEFAULT_PACE_SEC_PER_KM;
  const estimatedSec = durationSec ?? (distanceCm === null ? null : Math.round(workout.distanceKm * paceSecPerKm));
  const open = { targetType: TARGET_OPEN, targetLow: 0, targetHigh: 0, intensity: INTENSITY_ACTIVE };
  if (estimatedSec !== null) {
    return { durationType: DURATION_TIME, durationValue: estimatedSec * 1000, ...open };
  }
  return { durationType: DURATION_TIME, durationValue: 0, ...open };
}

class FitWriter {
  readonly bytes: number[] = [];

  u8(value: number): void {
    this.bytes.push(value & 0xff);
  }

  u16(value: number): void {
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff);
  }

  u32(value: number): void {
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  }

  string(value: string, size: number): void {
    const encoder = new TextEncoder();
    let written = 0;
    for (const character of value) {
      const encoded = encoder.encode(character);
      if (written + encoded.length > size - 1) break;
      for (const byte of encoded) this.bytes.push(byte);
      written += encoded.length;
    }
    while (written < size) {
      this.bytes.push(0);
      written += 1;
    }
  }

  definition(local: number, global: number, fields: FitFieldDefinition[]): void {
    this.u8(0x40 | local);
    this.u8(0);
    this.u8(0);
    this.u16(global);
    this.u8(fields.length);
    for (const field of fields) {
      this.u8(field.number);
      this.u8(field.size);
      this.u8(field.baseType);
    }
  }
}

export function buildWorkoutFit({ workout, paces = null, startAt }: FitBuildInput): Uint8Array<ArrayBuffer> {
  const steps = workout.steps.length > 0 ? workout.steps.map(resolveStep) : [fallbackStep(workout, paces)];
  const writer = new FitWriter();

  writer.definition(LOCAL_FILE_ID, FILE_ID_MESSAGE, FILE_ID_FIELDS);
  writer.u8(LOCAL_FILE_ID);
  writer.u8(FILE_TYPE_WORKOUT);
  writer.u16(MANUFACTURER_DEVELOPMENT);
  writer.u32(fitTimestamp(startAt ?? `${workout.date}T00:00:00Z`));

  writer.definition(LOCAL_WORKOUT, WORKOUT_MESSAGE, WORKOUT_FIELDS);
  writer.u8(LOCAL_WORKOUT);
  writer.u8(WORKOUT_SPORT_RUNNING);
  writer.u16(steps.length);
  writer.string(workout.title, WKT_NAME_SIZE);

  writer.definition(LOCAL_WORKOUT_STEP, WORKOUT_STEP_MESSAGE, WORKOUT_STEP_FIELDS);
  steps.forEach((step, index) => {
    writer.u8(LOCAL_WORKOUT_STEP);
    writer.u16(index);
    writer.u8(step.durationType);
    writer.u32(step.durationValue);
    writer.u8(step.targetType);
    writer.u32(step.targetLow);
    writer.u32(step.targetHigh);
    writer.u8(step.intensity);
  });

  const data = writer.bytes;
  const header = [
    HEADER_SIZE,
    PROTOCOL_VERSION,
    PROFILE_VERSION & 0xff,
    (PROFILE_VERSION >>> 8) & 0xff,
    data.length & 0xff,
    (data.length >>> 8) & 0xff,
    (data.length >>> 16) & 0xff,
    (data.length >>> 24) & 0xff,
    0x2e,
    0x46,
    0x49,
    0x54,
  ];
  const crc = fitCrc([...header, ...data]);
  return new Uint8Array([...header, ...data, crc & 0xff, (crc >>> 8) & 0xff]);
}
