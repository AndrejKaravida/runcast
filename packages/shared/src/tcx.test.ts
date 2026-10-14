import { describe, expect, it } from 'vitest';
import { buildWorkoutTcx, escapeXml, paceSpeedZone, paceToSpeedMps, type TcxWorkout } from './tcx';
import type { PlanPaces } from './types';

const PACES: PlanPaces = {
  easySlowSecPerKm: 360,
  easyFastSecPerKm: 330,
  marathonSecPerKm: 312,
  thresholdSecPerKm: 300,
  intervalSecPerKm: 285,
  repetitionSecPerKm: 270,
};

function workout(overrides: Partial<TcxWorkout> = {}): TcxWorkout {
  return {
    date: '2026-10-20',
    title: 'Lako trčanje 8 km',
    distanceKm: 8,
    durationSec: null,
    steps: [
      { label: 'Zagrevanje 2 km', distanceKm: 2, pace: '5:00' },
      { label: 'Tempo 20 min', durationSec: 1200, pace: '4:48' },
    ],
    ...overrides,
  };
}

function lapCount(tcx: string): number {
  return (tcx.match(/<Lap /g) ?? []).length;
}

describe('escapeXml', () => {
  it('escape-uje znakove koji kvare XML', () => {
    expect(escapeXml('a & b <c> "d" \'e\'')).toBe('a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos;');
  });

  it('čuva srpsku dijakritiku', () => {
    expect(escapeXml('Čučnjevi, ž;đ')).toBe('Čučnjevi, ž;đ');
  });
});

describe('paceToSpeedMps', () => {
  it('prevodi tempo u m/s', () => {
    expect(paceToSpeedMps('5:00')).toBeCloseTo(3.333, 3);
    expect(paceToSpeedMps('4:00')).toBeCloseTo(4.167, 3);
  });

  it('vraća null za neispravan ili prazan tempo', () => {
    expect(paceToSpeedMps(undefined)).toBeNull();
    expect(paceToSpeedMps('')).toBeNull();
    expect(paceToSpeedMps('4:60')).toBeNull();
    expect(paceToSpeedMps('tempo')).toBeNull();
  });
});

describe('paceSpeedZone', () => {
  it('gradi zonu ±5% oko tempa', () => {
    const zone = paceSpeedZone('5:00');
    expect(zone).not.toBeNull();
    expect(zone?.minSpeed).toBeCloseTo(3.1667, 4);
    expect(zone?.maxSpeed).toBeCloseTo(3.5, 4);
  });

  it('nema zone bez tempa', () => {
    expect(paceSpeedZone(undefined)).toBeNull();
  });
});

describe('buildWorkoutTcx', () => {
  it('gradi TCX 2.0 envelope sa jednim lapom po koraku', () => {
    const tcx = buildWorkoutTcx({ workout: workout() });
    expect(tcx.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
    expect(tcx).toContain(
      '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">',
    );
    expect(tcx).toContain('<Activity Sport="Running">');
    expect(tcx).toContain('</TrainingCenterDatabase>');
    expect(tcx.endsWith('\n')).toBe(true);
    expect(lapCount(tcx)).toBe(2);
    expect(tcx).toContain('Order="1"');
    expect(tcx).toContain('Order="2"');
    expect(tcx).toContain('<Id>2026-10-20T00:00:00Z</Id>');
    expect(tcx).toContain('<Lap StartTime="2026-10-20T00:00:00Z" Order="1">');
    expect(tcx).toContain('<Lap StartTime="2026-10-20T00:10:00Z" Order="2">');
  });

  it('koristi startAt za Id i start lapova', () => {
    const tcx = buildWorkoutTcx({ workout: workout(), startAt: '2026-10-19T22:00:00.000Z' });
    expect(tcx).toContain('<Id>2026-10-19T22:00:00Z</Id>');
    expect(tcx).toContain('<Lap StartTime="2026-10-19T22:00:00Z" Order="1">');
    expect(tcx).toContain('<Lap StartTime="2026-10-19T22:10:00Z" Order="2">');
  });

  it('ne grupiše ponovljene korake, svaki je zaseban lap', () => {
    const steps = Array.from({ length: 4 }, () => ({ label: '1000 m @ I (400 m jog)', distanceKm: 1, pace: '4:20' }));
    const tcx = buildWorkoutTcx({ workout: workout({ steps }) });
    expect(lapCount(tcx)).toBe(4);
    expect((tcx.match(/<Intensity>Rest<\/Intensity>/g) ?? []).length).toBe(4);
  });

  it('upisuje TotalTimeSeconds ili DistanceMeters u zavisnosti od koraka', () => {
    const tcx = buildWorkoutTcx({ workout: workout() });
    expect(tcx).toContain('<TotalTimeSeconds>600</TotalTimeSeconds>');
    expect(tcx).toContain('<DistanceMeters>2000</DistanceMeters>');
    expect(tcx).toContain('<TotalTimeSeconds>1200</TotalTimeSeconds>');
    expect(tcx).not.toContain('<DistanceMeters>4167</DistanceMeters>');
  });

  it('upisuje Target Speed/SpeedZone iz tempa i izostavlja ga bez tempa', () => {
    const tcx = buildWorkoutTcx({ workout: workout() });
    expect(tcx).toContain('<Target>');
    expect(tcx).toContain('<Speed>');
    expect(tcx).toContain('<SpeedZone>');
    expect(tcx).toContain('<MinSpeed>3.1667</MinSpeed>');
    expect(tcx).toContain('<MaxSpeed>3.5</MaxSpeed>');
    expect((tcx.match(/<Target>/g) ?? []).length).toBe(2);

    const noPace = buildWorkoutTcx({ workout: workout({ steps: [{ label: 'Lako trčanje', distanceKm: 5 }] }) });
    expect(noPace).not.toContain('<Target>');
    expect(noPace).toContain('<DistanceMeters>5000</DistanceMeters>');
    expect(noPace).not.toContain('<TotalTimeSeconds>');
  });

  it('escape-uje label koraka i naslov fallback lapa', () => {
    const tcx = buildWorkoutTcx({
      workout: workout({ title: 'A & B', steps: [{ label: '<Interval 4×400> & "jog"', distanceKm: 1, pace: '4:00' }] }),
    });
    expect(tcx).toContain('<Notes>&lt;Interval 4×400&gt; &amp; &quot;jog&quot;</Notes>');
    expect(tcx).not.toContain('<Interval 4×400>');

    const fallback = buildWorkoutTcx({ workout: workout({ title: 'Trka <42> & co', steps: [] }) });
    expect(fallback).toContain('<Notes>Trka &lt;42&gt; &amp; co</Notes>');
  });

  it('bez koraka vraća jedan lap iz distanceKm/durationSec', () => {
    const fromDuration = buildWorkoutTcx({ workout: workout({ steps: [], durationSec: 2700 }) });
    expect(lapCount(fromDuration)).toBe(1);
    expect(fromDuration).toContain('<TotalTimeSeconds>2700</TotalTimeSeconds>');
    expect(fromDuration).toContain('<DistanceMeters>8000</DistanceMeters>');
    expect(fromDuration).toContain('<Intensity>Active</Intensity>');
    expect(fromDuration).toContain('<Notes>Lako trčanje 8 km</Notes>');
    expect(fromDuration).not.toContain('<Target>');

    const fromPaces = buildWorkoutTcx({ workout: workout({ steps: [] }), paces: PACES });
    expect(fromPaces).toContain('<TotalTimeSeconds>2880</TotalTimeSeconds>');

    const fromDefault = buildWorkoutTcx({ workout: workout({ steps: [] }) });
    expect(fromDefault).toContain('<TotalTimeSeconds>2880</TotalTimeSeconds>');

    const empty = buildWorkoutTcx({ workout: workout({ steps: [], distanceKm: 0, durationSec: null }) });
    expect(lapCount(empty)).toBe(1);
    expect(empty).not.toContain('<TotalTimeSeconds>');
    expect(empty).not.toContain('<DistanceMeters>');
  });

  it('daje deterministički izlaz', () => {
    expect(buildWorkoutTcx({ workout: workout(), paces: PACES })).toBe(
      buildWorkoutTcx({ workout: workout(), paces: PACES }),
    );
  });
});
