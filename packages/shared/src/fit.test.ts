import { describe, expect, it } from 'vitest';
import { buildWorkoutFit, type FitWorkout } from './fit';
import type { PlanPaces } from './types';

const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01,
  0x8801, 0x4400,
];

function crc16(bytes: Uint8Array): number {
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

interface FitFieldDefinition {
  number: number;
  size: number;
  baseType: number;
}

interface FitDefinition {
  global: number;
  fields: FitFieldDefinition[];
}

type FitValue = number | string;

interface FitRecord {
  global: number;
  fields: Map<number, FitValue>;
}

interface ParsedFit {
  records: FitRecord[];
  dataSize: number;
  storedCrc: number;
  computedCrc: number;
}

function readFit(bytes: Uint8Array): ParsedFit {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerSize = bytes[0];
  const dataSize = view.getUint32(4, true);
  const definitions = new Map<number, FitDefinition>();
  const records: FitRecord[] = [];
  let offset = headerSize;
  const dataEnd = headerSize + dataSize;
  while (offset < dataEnd) {
    const recordHeader = bytes[offset];
    offset += 1;
    const local = recordHeader & 0x0f;
    if (recordHeader & 0x40) {
      const global = view.getUint16(offset + 2, true);
      const fieldCount = bytes[offset + 4];
      offset += 5;
      const fields: FitFieldDefinition[] = [];
      for (let index = 0; index < fieldCount; index += 1) {
        fields.push({ number: bytes[offset], size: bytes[offset + 1], baseType: bytes[offset + 2] });
        offset += 3;
      }
      definitions.set(local, { global, fields });
      continue;
    }
    const definition = definitions.get(local);
    if (!definition) throw new Error(`Nema definicije za lokalni broj ${local}`);
    const fields = new Map<number, FitValue>();
    for (const field of definition.fields) {
      if (field.baseType === 0x07) {
        let length = 0;
        while (bytes[offset + length] !== 0) length += 1;
        fields.set(field.number, new TextDecoder().decode(bytes.subarray(offset, offset + length)));
      } else if (field.size === 1) {
        fields.set(field.number, bytes[offset]);
      } else if (field.size === 2) {
        fields.set(field.number, view.getUint16(offset, true));
      } else {
        fields.set(field.number, view.getUint32(offset, true));
      }
      offset += field.size;
    }
    records.push({ global: definition.global, fields });
  }
  return {
    records,
    dataSize,
    storedCrc: view.getUint16(bytes.length - 2, true),
    computedCrc: crc16(bytes.subarray(0, bytes.length - 2)),
  };
}

function recordsOf(records: FitRecord[], global: number): FitRecord[] {
  return records.filter((record) => record.global === global);
}

const PACES: PlanPaces = {
  easySlowSecPerKm: 360,
  easyFastSecPerKm: 330,
  marathonSecPerKm: 312,
  thresholdSecPerKm: 300,
  intervalSecPerKm: 285,
  repetitionSecPerKm: 270,
};

function workout(overrides: Partial<FitWorkout> = {}): FitWorkout {
  return {
    date: '2026-10-20',
    title: 'Lako trčanje 8',
    distanceKm: 8,
    durationSec: null,
    steps: [
      { label: 'Zagrevanje 2 km', distanceKm: 2, pace: '5:00' },
      { label: 'Tempo 20 min', durationSec: 1200, pace: '4:48' },
    ],
    ...overrides,
  };
}

describe('buildWorkoutFit', () => {
  it('gradi FIT fajl sa 12B headerom, data sekcijom i validnim CRC-om', () => {
    const bytes = buildWorkoutFit({ workout: workout() });
    const parsed = readFit(bytes);
    expect(bytes[0]).toBe(12);
    expect(bytes[1]).toBe(0x10);
    expect(String.fromCharCode(...bytes.subarray(8, 12))).toBe('.FIT');
    expect(parsed.dataSize).toBeGreaterThan(0);
    expect(bytes.length).toBe(12 + parsed.dataSize + 2);
    expect(parsed.computedCrc).toBe(parsed.storedCrc);
    expect(crc16(new TextEncoder().encode('123456789'))).toBe(0xbb3d);
  });

  it('roundtrip: file_id, workout i koraci se parsiraju nazad', () => {
    const bytes = buildWorkoutFit({ workout: workout() });
    const { records } = readFit(bytes);

    const fileId = records[0];
    expect(fileId.global).toBe(0);
    expect(fileId.fields.get(0)).toBe(5);
    expect(fileId.fields.get(1)).toBe(255);
    expect(fileId.fields.get(4)).toBe(Math.round(Date.parse('2026-10-20T00:00:00Z') / 1000) - 631065600);

    const workoutRecord = records[1];
    expect(workoutRecord.global).toBe(26);
    expect(workoutRecord.fields.get(4)).toBe(1);
    expect(workoutRecord.fields.get(6)).toBe(2);
    expect(workoutRecord.fields.get(8)).toBe('Lako trčanje 8');

    const steps = recordsOf(records, 27);
    expect(steps).toHaveLength(2);
    expect(steps[0].fields.get(254)).toBe(0);
    expect(steps[0].fields.get(1)).toBe(1);
    expect(steps[0].fields.get(2)).toBe(200000);
    expect(steps[0].fields.get(3)).toBe(0);
    expect(steps[0].fields.get(5)).toBe(3333);
    expect(steps[0].fields.get(6)).toBe(3333);
    expect(steps[0].fields.get(7)).toBe(2);
    expect(steps[1].fields.get(254)).toBe(1);
    expect(steps[1].fields.get(1)).toBe(0);
    expect(steps[1].fields.get(2)).toBe(1200000);
    expect(steps[1].fields.get(3)).toBe(0);
    expect(steps[1].fields.get(5)).toBe(3472);
    expect(steps[1].fields.get(6)).toBe(3472);
    expect(steps[1].fields.get(7)).toBe(0);
  });

  it('prevodi pace u mm/s (5:00/km → 3333 mm/s)', () => {
    const bytes = buildWorkoutFit({
      workout: workout({ steps: [{ label: 'Tempo', durationSec: 600, pace: '5:00' }] }),
    });
    const step = recordsOf(readFit(bytes).records, 27)[0];
    expect(step.fields.get(3)).toBe(0);
    expect(step.fields.get(5)).toBe(3333);
    expect(step.fields.get(6)).toBe(3333);
  });

  it('bez tempa koristi target open', () => {
    const bytes = buildWorkoutFit({ workout: workout({ steps: [{ label: 'Lako trčanje', distanceKm: 5 }] }) });
    const step = recordsOf(readFit(bytes).records, 27)[0];
    expect(step.fields.get(3)).toBe(2);
    expect(step.fields.get(5)).toBe(0);
    expect(step.fields.get(6)).toBe(0);
  });

  it('intensity se izvodi iz labela koraka', () => {
    const steps = [
      { label: 'Zagrevanje 2 km', distanceKm: 2 },
      { label: 'Hlađenje 2 km', distanceKm: 2 },
      { label: '1000 m @ I (400 m jog)', distanceKm: 1 },
      { label: 'Tempo blok', durationSec: 600 },
    ];
    const bytes = buildWorkoutFit({ workout: workout({ steps }) });
    const intensities = recordsOf(readFit(bytes).records, 27).map((record) => record.fields.get(7));
    expect(intensities).toEqual([2, 3, 1, 0]);
  });

  it('seče predugačak wkt_name na 15 UTF-8 bajtova', () => {
    const long = buildWorkoutFit({ workout: workout({ title: 'A'.repeat(40), steps: [] }) });
    expect(readFit(long).records[1].fields.get(8)).toBe('A'.repeat(15));

    const multibyte = buildWorkoutFit({ workout: workout({ title: 'č'.repeat(10), steps: [] }) });
    expect(readFit(multibyte).records[1].fields.get(8)).toBe('č'.repeat(7));
  });

  it('bez koraka daje jedan step iz distance/duration', () => {
    const fromDuration = buildWorkoutFit({ workout: workout({ steps: [], durationSec: 2700 }) });
    const fromDurationSteps = recordsOf(readFit(fromDuration).records, 27);
    expect(fromDurationSteps).toHaveLength(1);
    expect(readFit(fromDuration).records[1].fields.get(6)).toBe(1);
    expect(fromDurationSteps[0].fields.get(1)).toBe(0);
    expect(fromDurationSteps[0].fields.get(2)).toBe(2700000);
    expect(fromDurationSteps[0].fields.get(3)).toBe(2);
    expect(fromDurationSteps[0].fields.get(7)).toBe(0);

    const fromPaces = buildWorkoutFit({ workout: workout({ steps: [] }), paces: PACES });
    expect(recordsOf(readFit(fromPaces).records, 27)[0].fields.get(2)).toBe(2880000);

    const fromDefault = buildWorkoutFit({ workout: workout({ steps: [] }) });
    expect(recordsOf(readFit(fromDefault).records, 27)[0].fields.get(2)).toBe(2880000);

    const empty = buildWorkoutFit({ workout: workout({ steps: [], distanceKm: 0 }) });
    const emptyStep = recordsOf(readFit(empty).records, 27)[0];
    expect(emptyStep.fields.get(1)).toBe(0);
    expect(emptyStep.fields.get(2)).toBe(0);
  });

  it('daje deterministički izlaz', () => {
    const first = buildWorkoutFit({ workout: workout(), paces: PACES });
    const second = buildWorkoutFit({ workout: workout(), paces: PACES });
    expect(Array.from(first)).toEqual(Array.from(second));
  });
});
