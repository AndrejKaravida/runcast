import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildFuelingPlan,
  buildStepTimeline,
  cueTextFor,
  elapsedAfterSkip,
  formatPace,
  segmentAt,
  type GuidedCueContext,
  type GuidedCueKind,
  type LocalizedText,
  type PlanPaces,
  type TimelineSegment,
} from '@runcast/shared';
import { useTranslation } from 'react-i18next';
import { vibrate } from '@/components/guided/haptics';
import { useGuidedClock, type GuidedPhase } from '@/components/guided/useGuidedClock';
import { useLiveTrack } from '@/components/guided/useLiveTrack';
import { useSpeechCues } from '@/components/guided/useSpeechCues';
import { useWakeLock } from '@/components/guided/useWakeLock';
import { typeLabel, workoutPaceLabel, workoutSteps } from '@/features/workouts/utils';
import type { RunLogsRow, WorkoutsRow } from '@/types';

interface GuidedRunnerOptions {
  workout: WorkoutsRow | null;
  paces: PlanPaces | null;
  logs: RunLogsRow[];
  timeScale: number;
}

const ENCOURAGE_FRACTION = 0.6;
const FUEL_AT_SEC = 45 * 60;
const WARMUP_LABEL_RE = /zagrevanje|hlađenje|warm ?up|cool ?down/i;

function isWorkSegment(segment: TimelineSegment): boolean {
  return !WARMUP_LABEL_RE.test(segment.label);
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

  const workoutType = workout?.type ?? '';
  const plannedDistanceKm = workout && workout.distance_km > 0 ? workout.distance_km : (timeline?.totalDistanceKm ?? 0);
  const briefPaceLabel = workout
    ? (workoutPaceLabel(workout, paces) ?? timeline?.segments.find((segment) => segment.paceLabel)?.paceLabel ?? '')
    : '';

  const clock = useGuidedClock(timeline?.totalDurationSec ?? 0, timeScale);
  const speech = useSpeechCues();
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const gpsActive =
    gpsEnabled && (clock.phase === 'countdown' || clock.phase === 'running' || clock.phase === 'paused');
  const geo = useLiveTrack({
    enabled: gpsActive,
    running: clock.phase === 'running',
    onAutoPause: clock.pause,
    onAutoResume: clock.resume,
  });
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
  const encourageSpokenRef = useRef(false);
  const fuelSpokenRef = useRef(false);
  const lastCoachRef = useRef('');
  const finishedCueRef = useRef(false);
  const fuelingIndexRef = useRef(0);

  const existingLog = workout ? (logs.find((entry) => entry.workout_id === workout.id) ?? null) : null;
  const position = timeline ? segmentAt(timeline, clock.elapsedSec) : null;
  const gpsFallback = gpsEnabled && (geo.status === 'denied' || geo.status === 'unsupported');
  const trackedDistanceKm = gpsEnabled && !gpsFallback && geo.distanceKm > 0.01 ? geo.distanceKm : null;
  const loggedDistanceKm = trackedDistanceKm ?? (gpsFallback || !gpsEnabled ? (workout?.distance_km ?? 0) : null);
  const gpsWithoutFix = gpsEnabled && !gpsFallback && trackedDistanceKm === null;
  const loggedDuration = Math.max(1, Math.round(clock.elapsedSec));
  const logSource: 'gps' | 'manual' = trackedDistanceKm !== null ? 'gps' : 'manual';
  const avgPaceSecPerKm =
    trackedDistanceKm !== null && trackedDistanceKm > 0.2 ? Math.round(clock.elapsedSec / trackedDistanceKm) : null;
  const avgPaceLabel = avgPaceSecPerKm !== null ? formatPace(avgPaceSecPerKm) : null;
  const summaryDistanceKm = trackedDistanceKm ?? plannedDistanceKm;

  const coachCue = useCallback(
    (segment: TimelineSegment): string | null => {
      if (!isWorkSegment(segment)) {
        lastCoachRef.current = '';
        return null;
      }
      const line = cueText('COACH', {
        workoutType,
        label: segment.label,
        paceLabel: segment.paceLabel ?? null,
      });
      if (line === lastCoachRef.current) return null;
      lastCoachRef.current = line;
      return line;
    },
    [cueText, workoutType],
  );

  const segmentSpeech = useCallback(
    (segment: TimelineSegment) => {
      const main =
        segment.repeatIndex !== undefined && segment.repeatTotal !== undefined
          ? cueText('REPEAT', segment)
          : cueText('SEGMENT_START', segment);
      const parts = [main];
      if (segment.paceLabel) parts.push(cueText('PACE', { paceLabel: segment.paceLabel }));
      const coach = coachCue(segment);
      if (coach) parts.push(coach);
      return parts.join(' ');
    },
    [coachCue, cueText],
  );

  useEffect(() => {
    const phase = clock.phase;
    const previous = prevPhaseRef.current;
    if (phase === previous) return;
    prevPhaseRef.current = phase;
    if (phase === 'running' && previous === 'countdown') {
      const first = timeline?.segments[0];
      const parts = [
        cueText('START'),
        cueText('BRIEF', {
          workoutType: typeLabel(t, workoutType),
          distanceKm: plannedDistanceKm,
          paceLabel: briefPaceLabel,
        }),
      ];
      if (first) {
        parts.push(segmentSpeech(first));
        segmentIndexRef.current = first.index;
      }
      speech.speak(parts.join(' '));
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
      speech.speak(
        cueText('SUMMARY', {
          workoutType,
          elapsedSec: clock.elapsedSec,
          distanceKm: summaryDistanceKm,
          paceLabel: avgPaceLabel,
        }),
      );
      speech.beep(880, 250);
    }
  }, [
    clock.phase,
    clock.elapsedSec,
    timeline,
    speech,
    cueText,
    segmentSpeech,
    workoutType,
    plannedDistanceKm,
    briefPaceLabel,
    summaryDistanceKm,
    avgPaceLabel,
    t,
  ]);

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
      speech.speak(segmentSpeech(current.segment));
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
  }, [clock.phase, clock.elapsedSec, timeline, speech, cueText, segmentSpeech]);

  useEffect(() => {
    if (clock.phase !== 'running' || !timeline || timeline.totalDurationSec <= 0) return;
    if (encourageSpokenRef.current) return;
    if (clock.elapsedSec < timeline.totalDurationSec * ENCOURAGE_FRACTION) return;
    encourageSpokenRef.current = true;
    speech.speak(cueText('ENCOURAGE', { workoutType }));
    speech.beep(760, 120);
  }, [clock.phase, clock.elapsedSec, timeline, workoutType, speech, cueText]);

  useEffect(() => {
    if (clock.phase !== 'running' || workoutType !== 'LONG') return;
    if (fuelSpokenRef.current || clock.elapsedSec < FUEL_AT_SEC) return;
    fuelSpokenRef.current = true;
    speech.speak(cueText('FUEL', { workoutType }));
    speech.beep(660, 120);
  }, [clock.phase, clock.elapsedSec, workoutType, speech, cueText]);

  useEffect(() => {
    if (clock.phase !== 'running' || fuelingCues.length === 0) return;
    const next = fuelingCues[fuelingIndexRef.current];
    if (!next || clock.elapsedSec < next.atSec) return;
    fuelingIndexRef.current += 1;
    speech.speak(localize(next.text));
    speech.beep(660, 120);
  }, [clock.phase, clock.elapsedSec, fuelingCues, speech, localize]);

  const splitsSeenRef = useRef(0);
  useEffect(() => {
    if (clock.phase !== 'running' || geo.splits.length <= splitsSeenRef.current) return;
    splitsSeenRef.current = geo.splits.length;
    const split = geo.splits[geo.splits.length - 1];
    vibrate(80);
    speech.beep(880, 120);
    speech.speak(cueText('SPLIT', { km: split.km, paceLabel: formatPace(split.paceSecPerKm) }));
  }, [clock.phase, geo.splits, speech, cueText]);

  const handleStart = () => {
    speech.unlock();
    clock.start();
  };

  const handleTogglePause = () => {
    geo.resetAutoPause();
    if (clock.phase === 'paused') {
      clock.resume();
      return;
    }
    clock.pause();
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
  const finishedCue = cueText('SUMMARY', {
    workoutType,
    elapsedSec: clock.elapsedSec,
    distanceKm: summaryDistanceKm,
    paceLabel: avgPaceLabel,
  });
  const bannerText =
    clock.phase === 'idle'
      ? t('guided:ready')
      : clock.phase === 'countdown'
        ? t('guided:countdown.banner')
        : clock.phase === 'paused'
          ? cueText('PAUSE')
          : clock.phase === 'finished'
            ? finishedCue
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
    logSource,
    gpsWithoutFix,
    gpsFallback,
    avgPaceSecPerKm,
    loggedDuration,
    bannerText,
    fuelingHint,
    handleStart,
    handleNext,
    handleBack,
    handleTogglePause,
  };
}
