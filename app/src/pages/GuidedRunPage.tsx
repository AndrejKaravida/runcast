import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildFuelingPlan,
  buildStepTimeline,
  cueTextFor,
  elapsedAfterSkip,
  formatDuration,
  segmentAt,
  type GuidedCueContext,
  type GuidedCueKind,
  type LocalizedText,
  type PlanPaces,
} from '@runcast/shared';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { CueBanner } from '@/components/guided/CueBanner';
import { formatKm } from '@/components/guided/format';
import { GuidedOverview } from '@/components/guided/GuidedOverview';
import { GuidedSessionCard } from '@/components/guided/GuidedSessionCard';
import { useGeoDistance } from '@/components/guided/useGeoDistance';
import { useGuidedClock, type GuidedPhase } from '@/components/guided/useGuidedClock';
import { useSpeechCues } from '@/components/guided/useSpeechCues';
import { useWakeLock } from '@/components/guided/useWakeLock';
import { AppButton } from '@/components/ui/AppButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/QueryError';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatRow } from '@/components/ui/StatRow';
import { LogWorkoutModal } from '@/components/workouts/LogWorkoutModal';
import { useRunLogs } from '@/features/logs/queries';
import { useActivePlan, useWorkout } from '@/features/plans/queries';
import { typeTone, workoutSteps } from '@/features/workouts/utils';

const MIN_TIME_SCALE = 0.1;
const MAX_TIME_SCALE = 120;

function parseTimeScale(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.min(Math.max(parsed, MIN_TIME_SCALE), MAX_TIME_SCALE);
}

export function GuidedRunPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const timeScale = parseTimeScale(searchParams.get('timeScale'));
  const { data: workout, isLoading, isError, refetch } = useWorkout(id);
  const { data: plan } = useActivePlan();
  const { data: logs = [] } = useRunLogs();

  const localize = useCallback((text: LocalizedText) => t(text.key, text.params), [t]);
  const cueText = useCallback(
    (kind: GuidedCueKind, context?: GuidedCueContext) => localize(cueTextFor(kind, context)),
    [localize],
  );

  const paces = (plan?.paces as unknown as PlanPaces | null) ?? null;
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
  const [logOpen, setLogOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
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

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[560px] space-y-3 px-4 py-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 py-6">
        <QueryError onRetry={() => void refetch()} />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 py-6">
        <EmptyState title={t('workout:missing.title')} description={t('workout:missing.description')} />
      </div>
    );
  }

  if (!timeline || timeline.invalidReason || timeline.segments.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 py-6">
        <EmptyState
          title={t('guided:empty.title')}
          description={t('guided:empty.description')}
          action={
            <Link to={`/workout/${workout.id}`}>
              <AppButton size="sm" variant="secondary">
                {t('guided:empty.action')}
              </AppButton>
            </Link>
          }
        />
      </div>
    );
  }

  const guidedTimeline = timeline;
  const activeSegment = position?.segment ?? guidedTimeline.segments[0];

  const isRepeatSegment = activeSegment.repeatIndex !== undefined && activeSegment.repeatTotal !== undefined;
  const segmentCue = isRepeatSegment ? cueText('REPEAT', activeSegment) : cueText('SEGMENT_START', activeSegment);
  const segmentCueWithPace = activeSegment.paceLabel
    ? `${segmentCue} ${cueText('PACE', { paceLabel: activeSegment.paceLabel })}`
    : segmentCue;
  const halfwayReached = guidedTimeline.totalDurationSec > 0 && clock.elapsedSec >= guidedTimeline.totalDurationSec / 2;
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

  if (clock.phase === 'idle') {
    return (
      <GuidedOverview
        title={workout.title}
        timeline={guidedTimeline}
        speechAvailable={speech.speechAvailable}
        wakeLockSupported={wakeLockSupported}
        gpsEnabled={gpsEnabled}
        onBack={() => navigate(-1)}
        onStart={handleStart}
        onToggleGps={() => setGpsEnabled((current) => !current)}
      />
    );
  }

  if (clock.phase === 'countdown') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col items-center justify-center gap-4 px-4 py-6">
        <p className="section-label">{t('guided:countdown.label')}</p>
        <p
          key={clock.countdownValue}
          data-testid="guided-countdown"
          className="num value-swap text-hero font-bold text-primary-ink"
        >
          {clock.countdownValue}
        </p>
        <CueBanner text={bannerText} />
      </div>
    );
  }

  if (clock.phase === 'finished') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-6">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-success-ink" aria-hidden />
          <h1 className="text-2xl font-semibold">{t('guided:finish.title')}</h1>
          <StatRow
            items={[
              { label: t('guided:finish.time'), value: formatDuration(Math.round(clock.elapsedSec)) },
              {
                label: t('guided:stats.distance'),
                value: loggedDistanceKm !== null ? `${formatKm(loggedDistanceKm)} km` : '—',
              },
              {
                label: t('guided:finish.source'),
                value: gpsEnabled ? t('guided:finish.sourceGps') : t('guided:finish.sourcePlan'),
              },
            ]}
            className="w-full max-w-sm rounded-xl bg-surface-elevated py-1"
          />
          {gpsWithoutFix ? <p className="text-caption text-warning-ink">{t('guided:finish.noFixHint')}</p> : null}
          <CueBanner text={bannerText} />
          {existingLog ? (
            <p className="text-sm text-text-secondary">{t('guided:finish.logged')}</p>
          ) : (
            <AppButton data-testid="guided-log" className="w-full max-w-sm" onClick={() => setLogOpen(true)}>
              {t('workout:log.title')}
            </AppButton>
          )}
          <AppButton variant="secondary" className="w-full max-w-sm" onClick={() => navigate(`/workout/${workout.id}`)}>
            {t('guided:finish.view')}
          </AppButton>
        </div>
        <LogWorkoutModal
          workout={workout}
          open={logOpen}
          onClose={() => setLogOpen(false)}
          prefill={{ distanceKm: loggedDistanceKm ?? undefined, durationSec: loggedDuration }}
        />
      </div>
    );
  }

  return (
    <>
      <GuidedSessionCard
        workoutTitle={workout.title}
        tone={typeTone(workout.type)}
        timeline={guidedTimeline}
        segment={activeSegment}
        remainingSec={position?.remainingSec ?? 0}
        elapsedSec={clock.elapsedSec}
        phase={clock.phase}
        bannerText={bannerText}
        fuelingHint={fuelingHint}
        muted={speech.muted}
        gpsEnabled={gpsEnabled}
        gpsStatus={geo.status}
        gpsDistanceKm={geo.distanceKm}
        onTogglePause={() => (clock.phase === 'paused' ? clock.resume() : clock.pause())}
        onNext={handleNext}
        onBack={handleBack}
        onFinish={() => setFinishOpen(true)}
        onToggleMute={speech.toggleMuted}
      />
      <ConfirmDialog
        open={finishOpen}
        title={t('guided:finish.confirmTitle')}
        description={t('guided:finish.confirmDescription')}
        confirmLabel={t('guided:finish.confirm')}
        tone="danger"
        onConfirm={() => {
          setFinishOpen(false);
          clock.finish();
        }}
        onClose={() => setFinishOpen(false)}
      />
    </>
  );
}
