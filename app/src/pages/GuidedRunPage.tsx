import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { GuidedCountdown } from '@/components/guided/GuidedCountdown';
import { GuidedFinish } from '@/components/guided/GuidedFinish';
import { GuidedOverview } from '@/components/guided/GuidedOverview';
import { GuidedSessionCard } from '@/components/guided/GuidedSessionCard';
import { useGuidedRunner } from '@/components/guided/useGuidedRunner';
import { AppLinkButton } from '@/components/ui/AppLinkButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/QueryError';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRunLogs } from '@/features/logs/queries';
import { planPaces } from '@/features/plans/plan-data';
import { useActivePlan, useWorkout } from '@/features/plans/queries';
import { typeTone } from '@/features/workouts/utils';

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
  const [finishOpen, setFinishOpen] = useState(false);
  const runner = useGuidedRunner({ workout: workout ?? null, paces: planPaces(plan), logs, timeScale });
  const { clock, speech, geo, timeline } = runner;

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
            <AppLinkButton to={`/workout/${workout.id}`} size="sm" variant="secondary">
              {t('guided:empty.action')}
            </AppLinkButton>
          }
        />
      </div>
    );
  }

  if (clock.phase === 'idle') {
    return (
      <GuidedOverview
        title={workout.title}
        timeline={timeline}
        speechAvailable={speech.speechAvailable}
        wakeLockSupported={runner.wakeLockSupported}
        gpsEnabled={runner.gpsEnabled}
        onBack={() => navigate(-1)}
        onStart={runner.handleStart}
        onToggleGps={() => runner.setGpsEnabled((current) => !current)}
      />
    );
  }

  if (clock.phase === 'countdown') {
    return <GuidedCountdown countdownValue={clock.countdownValue} bannerText={runner.bannerText} />;
  }

  if (clock.phase === 'finished') {
    return (
      <GuidedFinish
        workout={workout}
        elapsedSec={clock.elapsedSec}
        loggedDistanceKm={runner.loggedDistanceKm}
        loggedDuration={runner.loggedDuration}
        logSource={runner.logSource}
        gpsWithoutFix={runner.gpsWithoutFix}
        bannerText={runner.bannerText}
        existingLog={runner.existingLog}
        onView={() => navigate(`/workout/${workout.id}`)}
      />
    );
  }

  const activeSegment = runner.activeSegment ?? timeline.segments[0];

  return (
    <>
      <GuidedSessionCard
        workoutTitle={workout.title}
        tone={typeTone(workout.type)}
        timeline={timeline}
        segment={activeSegment}
        remainingSec={runner.position?.remainingSec ?? 0}
        elapsedSec={clock.elapsedSec}
        phase={clock.phase}
        bannerText={runner.bannerText}
        fuelingHint={runner.fuelingHint}
        muted={speech.muted}
        gpsEnabled={runner.gpsEnabled}
        gpsStatus={geo.status}
        gpsDistanceKm={geo.distanceKm}
        plannedDistanceKm={workout.distance_km > 0 ? workout.distance_km : timeline.totalDistanceKm}
        paceEmaSecPerKm={geo.paceEmaSecPerKm}
        avgPaceSecPerKm={runner.avgPaceSecPerKm}
        splits={geo.splits}
        gpsLost={geo.gpsLost}
        gpsFallback={runner.gpsFallback}
        onTogglePause={runner.handleTogglePause}
        onNext={runner.handleNext}
        onBack={runner.handleBack}
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
