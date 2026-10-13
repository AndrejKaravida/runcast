import { describe, expect, it } from 'vitest';
import { buildStepTimeline, cueTextFor, elapsedAfterSkip, isGuidedRunType, parsePaceLabel, segmentAt } from './guided';
import type { PlanPaces, WorkoutStep } from './types';

const paces: PlanPaces = {
  easySlowSecPerKm: 389,
  easyFastSecPerKm: 325,
  marathonSecPerKm: 306,
  thresholdSecPerKm: 288,
  intervalSecPerKm: 260,
  repetitionSecPerKm: 240,
};

const run = (type: string, steps: WorkoutStep[], paceZone: string | null = 'E', distanceKm = 0) => ({
  type,
  paceZone,
  distanceKm,
  steps,
});

describe('guided timeline', () => {
  it('derives duration from distance and pace label', () => {
    const timeline = buildStepTimeline(run('EASY', [{ label: 'E tempo', distanceKm: 5, pace: '5:25' }], 'E', 5), paces);
    expect(timeline.invalidReason).toBeUndefined();
    expect(timeline.segments).toHaveLength(1);
    expect(timeline.segments[0].durationSec).toBe(1625);
    expect(timeline.segments[0].paceSecPerKm).toBe(325);
    expect(timeline.segments[0].estimated).toBe(false);
    expect(timeline.totalDurationSec).toBe(1625);
    expect(timeline.totalDistanceKm).toBe(5);
  });

  it('uses explicit durationSec verbatim for tempo steps', () => {
    const timeline = buildStepTimeline(
      run(
        'TEMPO',
        [
          { label: 'Zagrevanje 2 km', distanceKm: 2, pace: '5:25' },
          { label: 'Tempo 20 min', durationSec: 1200, pace: '4:48' },
          { label: 'Hlađenje 2 km', distanceKm: 2, pace: '5:25' },
        ],
        'T',
        10,
      ),
      paces,
    );
    expect(timeline.segments.map((segment) => segment.durationSec)).toEqual([650, 1200, 650]);
    expect(timeline.totalDurationSec).toBe(2500);
    expect(timeline.segments[1].paceLabel).toBe('4:48');
  });

  it('groups consecutive identical interval steps into repeats', () => {
    const steps: WorkoutStep[] = [{ label: 'Zagrevanje 2 km', distanceKm: 2, pace: '5:25' }];
    for (let i = 0; i < 4; i += 1) steps.push({ label: '1000 m @ I (400 m jog)', distanceKm: 1, pace: '4:20' });
    const timeline = buildStepTimeline(run('INTERVALS', steps, 'I', 7.6), paces);
    expect(timeline.segments).toHaveLength(5);
    const repeats = timeline.segments.slice(1);
    expect(repeats.map((segment) => segment.repeatIndex)).toEqual([1, 2, 3, 4]);
    expect(repeats.every((segment) => segment.repeatTotal === 4)).toBe(true);
    expect(repeats.every((segment) => segment.durationSec === 260)).toBe(true);
  });

  it('falls back to zone pace then default with estimated flag', () => {
    const zoned = buildStepTimeline(run('INTERVALS', [{ label: '1000 m', distanceKm: 1 }], 'I'), paces);
    expect(zoned.segments[0].paceSecPerKm).toBe(260);
    expect(zoned.segments[0].estimated).toBe(false);

    const fallback = buildStepTimeline(run('EASY', [{ label: 'Lako trčanje', distanceKm: 1 }], null), null);
    expect(fallback.segments[0].paceSecPerKm).toBe(360);
    expect(fallback.segments[0].estimated).toBe(true);
    expect(fallback.estimatedPaces).toBe(true);
  });

  it('rejects non-run workouts, races and empty steps', () => {
    expect(buildStepTimeline(run('STRENGTH', [{ label: 'Čučnjevi', durationSec: 90 }]), paces).invalidReason).toBe(
      'NOT_A_RUN',
    );
    expect(buildStepTimeline(run('REST', []), paces).invalidReason).toBe('NOT_A_RUN');
    expect(buildStepTimeline(run('RACE', [{ label: 'Trka 42 km', distanceKm: 42 }]), paces).invalidReason).toBe(
      'NOT_A_RUN',
    );
    expect(buildStepTimeline(run('EASY', []), paces).invalidReason).toBe('NO_STEPS');
    expect(buildStepTimeline(run('EASY', [{ label: 'Prazno' }]), paces).invalidReason).toBe('NO_STEPS');
  });

  it('parses pace labels and finds positions on boundaries', () => {
    expect(parsePaceLabel('5:25')).toBe(325);
    expect(parsePaceLabel('4:60')).toBeNull();
    expect(parsePaceLabel(undefined)).toBeNull();

    const timeline = buildStepTimeline(
      run(
        'TEMPO',
        [
          { label: 'Zagrevanje', distanceKm: 1, pace: '5:00' },
          { label: 'Tempo', durationSec: 200, pace: '4:00' },
          { label: 'Hlađenje', distanceKm: 1, pace: '5:00' },
        ],
        'T',
      ),
      paces,
    );
    const first = segmentAt(timeline, 60);
    expect(first?.segment.index).toBe(0);
    expect(first?.remainingSec).toBe(240);
    const second = segmentAt(timeline, 300);
    expect(second?.segment.index).toBe(1);
    expect(second?.offsetSec).toBe(0);
    const last = segmentAt(timeline, 999);
    expect(last?.segment.index).toBe(2);
    expect(last?.remainingSec).toBe(0);
  });

  it('computes cumulative elapsed for skips', () => {
    const timeline = buildStepTimeline(
      run(
        'TEMPO',
        [
          { label: 'Zagrevanje', distanceKm: 1, pace: '5:00' },
          { label: 'Tempo', durationSec: 200, pace: '4:00' },
          { label: 'Hlađenje', distanceKm: 1, pace: '5:00' },
        ],
        'T',
      ),
      paces,
    );
    expect(elapsedAfterSkip(timeline, 0)).toBe(0);
    expect(elapsedAfterSkip(timeline, 1)).toBe(300);
    expect(elapsedAfterSkip(timeline, 2)).toBe(500);
    expect(elapsedAfterSkip(timeline, 99)).toBe(800);
  });

  it('allows only guided run types', () => {
    expect(isGuidedRunType('EASY')).toBe(true);
    expect(isGuidedRunType('INTERVALS')).toBe(true);
    expect(isGuidedRunType('RACE')).toBe(false);
    expect(isGuidedRunType('STRENGTH')).toBe(false);
    expect(isGuidedRunType('REST')).toBe(false);
  });

  it('vraća ključeve i parametre za svaki cue', () => {
    expect(cueTextFor('START')).toEqual({ key: 'content:guided.cue.start' });
    expect(cueTextFor('SEGMENT_START', { label: 'Tempo 20 min' })).toEqual({
      key: 'content:guided.cue.segmentStart',
      params: { label: 'Tempo 20 min' },
    });
    expect(cueTextFor('SEGMENT_START')).toEqual({ key: 'content:guided.cue.segmentStartFallback' });
    expect(cueTextFor('REPEAT', { repeatIndex: 2, repeatTotal: 4 })).toEqual({
      key: 'content:guided.cue.repeat',
      params: { index: 2, total: 4 },
    });
    expect(cueTextFor('PACE', { paceLabel: '4:48' })).toEqual({
      key: 'content:guided.cue.pace',
      params: { pace: '4:48' },
    });
    expect(cueTextFor('HALFWAY')).toEqual({ key: 'content:guided.cue.halfway' });
    expect(cueTextFor('PAUSE')).toEqual({ key: 'content:guided.cue.pause' });
    expect(cueTextFor('SKIP', { label: 'Hlađenje' })).toEqual({
      key: 'content:guided.cue.skip',
      params: { label: 'Hlađenje' },
    });
    expect(cueTextFor('SKIP')).toEqual({ key: 'content:guided.cue.skipFallback' });
    expect(cueTextFor('FINISH', { elapsedSec: 3661 })).toEqual({
      key: 'content:guided.cue.finish',
      params: { elapsed: '1:01:01' },
    });
    expect(cueTextFor('DISTANCE', { distanceKm: 5.25 })).toEqual({
      key: 'content:guided.cue.distance',
      params: { km: 5.25 },
    });
  });
});
