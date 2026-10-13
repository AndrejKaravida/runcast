import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildFuelingPlan,
  buildStepTimeline,
  cueTextFor,
  elapsedAfterSkip,
  segmentAt,
  type GuidedCueContext,
  type GuidedCueKind,
  type LocalizedText,
  type PlanPaces,
  type TimelineSegment,
} from '@runcast/shared';
import { useTranslation } from 'react-i18next';
import { useGeoDistance } from '@/components/guided/useGeoDistance';
import { useGuidedClock, type GuidedPhase } from '@/components/guided/useGuidedClock';
import { useSpeechCues } from '@/components/guided/useSpeechCues';
import { useWakeLock } from '@/components/guided/useWakeLock';
import { workoutSteps } from '@/features/workouts/utils';
import type { RunLogsRow, WorkoutsRow } from '@/types';

interface GuidedRunnerOptions {
  workout: WorkoutsRow | null;
  paces: PlanPaces | null;
  logs: RunLogsRow[];
  timeScale: number;
}

export function useGuidedRunner({ workout, paces, logs, timeScale }: GuidedRunnerOptions) {
  const { t } = useTranslation();

  const localize = useCallback((text: LocalizedText) => t(text.key, text.params), [t]);
  const cueText = useCallback(
    (kind: GuidedCueKind, context?: GuidedCueContext) => localize(cueTextFor(kind, context)),
    [localize],
  );

  const timeline = useMemo(() => {
    if (!workout) return null;
    return buildStepTimeline(
      {
        type: workout.type,
        paceZone: workout.pace_zone,
        distanceKm: workout.distance_km,
        steps: workoutSteps(workout),
      },
      paces,
    );
  }, [workout, paces]);

  const clock = useGuidedClock(timeline?.totalDurationSec ?? 0, timeScale);
  const speech = useSpeechCues();
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const geo = useGeoDistance(gpsEnabled && clock.phase === 'running');
  const wakeLockSupported = useWakeLock(
    clock.phase === 'countdown' || clock.phase === 'running' || clock.phase === 'paused',
  );
  const [fuelingOn] = useState(() => localStorage.getItem('runcast.fueling') !== 'off');
  const fuelingCues = useMemo(() => {
    if (!fuelingOn || !workout || workout.type !== 'LONG' || !timeline) return [];
    return buildFuelingPlan({ type: workout.type, durationSec: timeline.totalDurationSec })?.during ?? [];
  }, [fuelingOn, workout, timeline]);

  const prevPhaseRef = useRef<GuidedPhase>('idle');
  const segmentIndexRef = useRef(-1);
  const halfwaySpokenRef = useRef(false);
  const finishedCueRef = useRef(false);
  const fuelingIndexRef = useRef(0);

  const existingLog = workout ? (logs.find((entry) => entry.workout_id === workout.id) ?? null) : null;
  const position = timeline ? segmentAt(timeline, clock.elapsedSec) : null;
  const trackedDistanceKm = gpsEnabled && geo.distanceKm > 0.01 ? geo.distanceKm : null;
  const loggedDistanceKm = trackedDistanceKm ?? (gpsEnabled ? null : (workout?.distance_km ?? 0));
  const gpsWithoutFix = gpsEnabled && trackedDistanceKm === null;
  const loggedDuration = Math.max(1, Math.round(clock.elapsedSec));

  useEffect(() => {
    const phase = clock.phase;
    const previous = prevPhaseRef.current;
    if (phase === previous) return;
    prevPhaseRef.current = phase;
    if (phase === 'running' && previous === 'countdown') {
      speech.speak(cueText('START'));
      speech.beep(880);
      return;
    }
    if (phase === 'running' && previous === 'paused') {
      speech.speak(cueText('RESUME'));
      return;
    }
    if (phase === 'paused') {
      speech.speak(cueText('PAUSE'));
      return;
    }
    if (phase === 'finished' && !finishedCueRef.current) {
      finishedCueRef.current = true;
      const base = cueText('FINISH', { elapsedSec: clock.elapsedSec });
      const text =
        gpsEnabled && geo.distanceKm > 0.01 ? `${base} ${cueText('DISTANCE', { distanceKm: geo.distanceKm })}` : base;
      speech.speak(text);
      speech.beep(880, 250);
    }
  }, [clock.phase, clock.elapsedSec, gpsEnabled, geo.distanceKm, speech, cueText]);

  useEffect(() => {
    if (clock.phase !== 'countdown') return;
    speech.beep(660, 80);
  }, [clock.countdownValue, clock.phase, speech]);

  useEffect(() => {
    if (clock.phase !== 'running' || !timeline) return;
    const current = segmentAt(timeline, clock.elapsedSec);
    if (!current) return;
    if (current.segment.index !== segmentIndexRef.current) {
      const isForward = segmentIndexRef.current >= 0 && current.segment.index > segmentIndexRef.current;
      segmentIndexRef.current = current.segment.index;
      const segment = current.segment;
      const isRepeat = segment.repeatIndex !== undefined && segment.repeatTotal !== undefined;
      const main = isRepeat ? cueText('REPEAT', segment) : cueText('SEGMENT_START', segment);
      const text = segment.paceLabel ? `${main} ${cueText('PACE', { paceLabel: segment.paceLabel })}` : main;
      speech.speak(text);
      speech.beep(isForward ? 660 : 880, 100);
    }
    if (
      !halfwaySpokenRef.current &&
      timeline.totalDurationSec > 0 &&
      clock.elapsedSec >= timeline.totalDurationSec / 2
    ) {
      halfwaySpokenRef.current = true;
      speech.speak(cueText('HALFWAY'));
      speech.beep(880, 120);
    }
  }, [clock.phase, clock.elapsedSec, timeline, speech, cueText]);

  useEffect(() => {
    if (clock.phase !== 'running' || fuelingCues.length === 0) return;
    const next = fuelingCues[fuelingIndexRef.current];
    if (!next || clock.elapsedSec < next.atSec) return;
    fuelingIndexRef.current += 1;
    speech.speak(localize(next.text));
    speech.beep(660, 120);
  }, [clock.phase, clock.elapsedSec, fuelingCues, speech, localize]);

  const handleStart = () => {
    speech.unlock();
    clock.start();
  };

  const handleNext = () => {
    if (!timeline || !position) return;
    const nextIndex = position.segment.index + 1;
    if (nextIndex >= timeline.segments.length) {
      clock.finish();
      return;
    }
    clock.seekTo(elapsedAfterSkip(timeline, nextIndex));
  };

  const handleBack = () => {
    if (!timeline || !position) return;
    clock.seekTo(elapsedAfterSkip(timeline, Math.max(0, position.segment.index - 1)));
  };

  const activeSegment: TimelineSegment | null = position?.segment ?? timeline?.segments[0] ?? null;
  const isRepeatSegment = activeSegment?.repeatIndex !== undefined && activeSegment?.repeatTotal !== undefined;
  const segmentCue = activeSegment
    ? isRepeatSegment
      ? cueText('REPEAT', activeSegment)
      : cueText('SEGMENT_START', activeSegment)
    : '';
  const segmentCueWithPace = activeSegment?.paceLabel
    ? `${segmentCue} ${cueText('PACE', { paceLabel: activeSegment.paceLabel })}`
    : segmentCue;
  const halfwayReached =
    Boolean(timeline && timeline.totalDurationSec > 0) && clock.elapsedSec >= (timeline?.totalDurationSec ?? 0) / 2;
  const finishedCue = cueText('FINISH', { elapsedSec: clock.elapsedSec });
  const finishedCueWithDistance =
    gpsEnabled && geo.distanceKm > 0.01
      ? `${finishedCue} ${cueText('DISTANCE', { distanceKm: geo.distanceKm })}`
      : finishedCue;
  const bannerText =
    clock.phase === 'idle'
      ? t('guided:ready')
      : clock.phase === 'countdown'
        ? t('guided:countdown.banner')
        : clock.phase === 'paused'
          ? cueText('PAUSE')
          : clock.phase === 'finished'
            ? finishedCueWithDistance
            : halfwayReached
              ? `${segmentCueWithPace} ${cueText('HALFWAY')}`
              : segmentCueWithPace;

  const firedFuelingCount = fuelingCues.filter((cue) => cue.atSec <= clock.elapsedSec).length;
  const nextFuelingCue = fuelingCues[firedFuelingCount];
  const lastFuelingCue = firedFuelingCount > 0 ? fuelingCues[firedFuelingCount - 1] : undefined;
  const fuelingHint = lastFuelingCue
    ? { fired: true, text: localize(lastFuelingCue.text) }
    : nextFuelingCue
      ? {
          fired: false,
          text: t('content:fueling.nextGel', {
            minutes: Math.max(1, Math.ceil((nextFuelingCue.atSec - clock.elapsedSec) / 60)),
          }),
        }
      : undefined;

  return {
    timeline,
    clock,
    speech,
    gpsEnabled,
    setGpsEnabled,
    geo,
    wakeLockSupported,
    existingLog,
    position,
    activeSegment,
    loggedDistanceKm,
    gpsWithoutFix,
    loggedDuration,
    bannerText,
    fuelingHint,
    handleStart,
    handleNext,
    handleBack,
  };
}
