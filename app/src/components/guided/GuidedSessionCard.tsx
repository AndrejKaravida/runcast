import { clsx } from 'clsx';
import { formatDuration, type GuidedTimeline, type TimelineSegment } from '@runcast/shared';
import { Droplets, Square, Volume2, VolumeX } from 'lucide-react';
import { CueBanner } from '@/components/guided/CueBanner';
import { formatKm } from '@/components/guided/format';
import { GuidedControls } from '@/components/guided/GuidedControls';
import type { GeoStatus } from '@/components/guided/useGeoDistance';
import type { GuidedPhase } from '@/components/guided/useGuidedClock';
import { AppBadge } from '@/components/ui/AppBadge';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { StatTile } from '@/components/ui/StatTile';
import { TONE_TEXT_CLASSES, type Tone } from '@/features/workouts/utils';

interface GuidedSessionCardProps {
  workoutTitle: string;
  tone: Tone;
  timeline: GuidedTimeline;
  segment: TimelineSegment;
  remainingSec: number;
  elapsedSec: number;
  phase: GuidedPhase;
  bannerText: string;
  fuelingHint?: { fired: boolean; text: string };
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
  tone,
  timeline,
  segment,
  remainingSec,
  elapsedSec,
  phase,
  bannerText,
  fuelingHint,
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
  const paused = phase === 'paused';
  const gpsText = gpsStatus === 'tracking' ? 'GPS aktivan' : gpsStatus === 'denied' ? 'GPS blokiran' : 'GPS start';

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <p className="section-label min-w-0 flex-1 truncate">
          Korak {segment.index + 1}/{timeline.segments.length}
          {segment.repeatIndex ? ` · ${segment.repeatIndex}/${segment.repeatTotal}` : ''}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <AppBadge tone={paused ? 'warning' : 'primary'}>{paused ? 'Pauza' : 'U toku'}</AppBadge>
          <IconButton data-testid="guided-finish" label="Završi trening" className="h-10 w-10" onClick={onFinish}>
            <Square className="h-4 w-4" aria-hidden />
          </IconButton>
          <IconButton
            data-testid="guided-mute"
            label={muted ? 'Uključi zvuk' : 'Isključi zvuk'}
            aria-pressed={muted}
            className="h-10 w-10"
            onClick={onToggleMute}
          >
            {muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
          </IconButton>
        </div>
      </div>
      <p className="mt-1 truncate text-caption text-text-muted">{workoutTitle}</p>

      <section className="mt-6 flex flex-col items-center gap-2 text-center">
        <p className="text-lg font-semibold">{segment.label}</p>
        {segment.paceLabel ? (
          <>
            <p className={clsx('num text-hero font-bold tracking-display', TONE_TEXT_CLASSES[tone])}>
              {segment.paceLabel}
              <span className="text-lg font-semibold text-text-secondary"> /km</span>
            </p>
            <p className="section-label">ciljni tempo{segment.estimated ? ' · procena' : ''}</p>
          </>
        ) : (
          <p className="num text-hero font-bold tracking-display">{formatDuration(Math.ceil(remainingSec))}</p>
        )}
        <div className="mt-3 flex w-full gap-0.5" aria-hidden>
          {timeline.segments.map((item) => (
            <span
              key={item.index}
              className={clsx(
                'h-1.5 flex-1 rounded-full',
                item.index <= segment.index ? 'bg-primary' : 'bg-surface-elevated',
              )}
            />
          ))}
        </div>
        <ProgressRing value={segmentProgress} size={140} stroke={10} tone={tone === 'neutral' ? 'primary' : tone}>
          <div className="text-center">
            <p className="num text-stat font-semibold">{formatDuration(Math.ceil(remainingSec))}</p>
            <p className="section-label">do kraja</p>
          </div>
        </ProgressRing>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <StatTile
          label="Ukupno"
          value={<span data-testid="guided-elapsed">{formatDuration(Math.floor(elapsedSec))}</span>}
        />
        <StatTile
          label="Distanca"
          value={gpsEnabled ? `${formatKm(gpsDistanceKm)} km` : `${formatKm(timeline.totalDistanceKm)} km`}
        />
        <StatTile label="Tempo" value={segment.paceLabel ? `${segment.paceLabel} /km` : '—'} />
        <StatTile label="Preostalo" value={formatDuration(Math.ceil(remainingSec))} />
        <StatTile label="Korak" value={`${segment.index + 1}/${timeline.segments.length}`} />
        <StatTile
          label="Sledeće"
          value={nextSegment ? nextSegment.label : 'Kraj'}
          valueClassName="text-base text-text-secondary"
        />
      </div>

      {gpsEnabled ? <p className="mt-2 text-caption text-text-muted num">{gpsText}</p> : null}

      <div className="mt-6">
        <CueBanner text={bannerText} />
      </div>

      {fuelingHint ? (
        <p
          data-testid="guided-fueling"
          className={clsx(
            'mt-2 flex items-center justify-center gap-1.5 text-caption',
            fuelingHint.fired ? 'text-primary-ink' : 'text-text-muted',
          )}
        >
          <Droplets className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{fuelingHint.text}</span>
        </p>
      ) : null}

      <div className="sticky bottom-0 mt-6 bg-bg/90 pb-2 pt-3 backdrop-blur-xl">
        <GuidedControls
          phase={phase}
          canGoBack={segment.index > 0}
          onTogglePause={onTogglePause}
          onNext={onNext}
          onBack={onBack}
        />
      </div>
    </div>
  );
}
