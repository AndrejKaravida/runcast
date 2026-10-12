import { formatDuration, type GuidedTimeline, type TimelineSegment } from '@runcast/shared';
import { CueBanner } from '@/components/guided/CueBanner';
import { formatKm } from '@/components/guided/format';
import { GuidedControls } from '@/components/guided/GuidedControls';
import type { GeoStatus } from '@/components/guided/useGeoDistance';
import type { GuidedPhase } from '@/components/guided/useGuidedClock';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppCard } from '@/components/ui/AppCard';
import { ProgressRing } from '@/components/ui/ProgressRing';

interface GuidedSessionCardProps {
  workoutTitle: string;
  timeline: GuidedTimeline;
  segment: TimelineSegment;
  remainingSec: number;
  elapsedSec: number;
  phase: GuidedPhase;
  bannerText: string;
  muted: boolean;
  gpsEnabled: boolean;
  gpsStatus: GeoStatus;
  gpsDistanceKm: number;
  onTogglePause: () => void;
  onNext: () => void;
  onBack: () => void;
  onFinish: () => void;
  onToggleMute: () => void;
}

export function GuidedSessionCard({
  workoutTitle,
  timeline,
  segment,
  remainingSec,
  elapsedSec,
  phase,
  bannerText,
  muted,
  gpsEnabled,
  gpsStatus,
  gpsDistanceKm,
  onTogglePause,
  onNext,
  onBack,
  onFinish,
  onToggleMute,
}: GuidedSessionCardProps) {
  const segmentProgress = segment.durationSec > 0 ? 1 - remainingSec / segment.durationSec : 0;
  const nextSegment = timeline.segments[segment.index + 1] ?? null;

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-4 px-4 py-6">
      <AppCard className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{workoutTitle}</p>
            <p className="text-xs text-text-muted">
              Korak {segment.index + 1}/{timeline.segments.length}
              {segment.repeatIndex ? ` · ponavljanje ${segment.repeatIndex}/${segment.repeatTotal}` : ''}
            </p>
          </div>
          <AppBadge tone={phase === 'paused' ? 'warning' : 'primary'}>
            {phase === 'paused' ? 'Pauza' : 'U toku'}
          </AppBadge>
        </div>

        <div className="flex flex-col items-center gap-3">
          <ProgressRing value={segmentProgress} size={160} stroke={10}>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatDuration(Math.ceil(remainingSec))}</p>
              <p className="text-[11px] text-text-muted">do kraja koraka</p>
            </div>
          </ProgressRing>
          <p className="text-center text-sm font-medium">{segment.label}</p>
          {segment.paceLabel ? (
            <p className="text-xs text-text-muted">
              Tempo {segment.paceLabel} /km{segment.estimated ? ' (procena)' : ''}
            </p>
          ) : null}
        </div>

        <CueBanner text={bannerText} />

        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">Ukupno</span>
          <span data-testid="guided-elapsed" className="font-semibold">
            {formatDuration(Math.floor(elapsedSec))}
          </span>
        </div>
        {nextSegment ? <p className="text-xs text-text-muted">Sledeće: {nextSegment.label}</p> : null}
        {gpsEnabled ? (
          <p className="text-xs text-text-muted">
            {gpsStatus === 'tracking'
              ? `GPS: ${formatKm(gpsDistanceKm)} km`
              : gpsStatus === 'denied'
                ? 'GPS nedostupan — dozvoli lokaciju'
                : 'GPS se pokreće…'}
          </p>
        ) : null}

        <GuidedControls
          phase={phase}
          muted={muted}
          canGoBack={segment.index > 0}
          onTogglePause={onTogglePause}
          onNext={onNext}
          onBack={onBack}
          onFinish={onFinish}
          onToggleMute={onToggleMute}
        />
      </AppCard>
    </div>
  );
}
