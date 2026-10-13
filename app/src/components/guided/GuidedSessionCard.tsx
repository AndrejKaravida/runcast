import { clsx } from 'clsx';
import { formatDuration, formatPace, type GuidedTimeline, type LiveSplit, type TimelineSegment } from '@runcast/shared';
import { Droplets, Square, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CueBanner } from '@/components/guided/CueBanner';
import { formatKm } from '@/components/guided/format';
import { GuidedControls } from '@/components/guided/GuidedControls';
import type { GeoStatus } from '@/components/guided/useLiveTrack';
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
  plannedDistanceKm: number;
  paceEmaSecPerKm: number | null;
  avgPaceSecPerKm: number | null;
  splits: LiveSplit[];
  gpsLost: boolean;
  gpsFallback: boolean;
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
  plannedDistanceKm,
  paceEmaSecPerKm,
  avgPaceSecPerKm,
  splits,
  gpsLost,
  gpsFallback,
  onTogglePause,
  onNext,
  onBack,
  onFinish,
  onToggleMute,
}: GuidedSessionCardProps) {
  const { t } = useTranslation('guided');
  const segmentProgress = segment.durationSec > 0 ? 1 - remainingSec / segment.durationSec : 0;
  const nextSegment = timeline.segments[segment.index + 1] ?? null;
  const paused = phase === 'paused';
  const gpsText =
    gpsStatus === 'tracking'
      ? t('session.gpsTracking')
      : gpsStatus === 'denied'
        ? t('session.gpsDenied')
        : t('session.gpsStart');
  const progressPercent = plannedDistanceKm > 0 ? Math.min(gpsDistanceKm / plannedDistanceKm, 1) * 100 : 0;
  const livePaceText = paceEmaSecPerKm !== null ? `${formatPace(paceEmaSecPerKm)} /km` : '—';
  const avgPaceText = avgPaceSecPerKm !== null ? `${formatPace(avgPaceSecPerKm)} /km` : '—';

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <p className="section-label min-w-0 flex-1 truncate">
          {t('session.step', { index: segment.index + 1, total: timeline.segments.length })}
          {segment.repeatIndex
            ? t('session.repeatSuffix', { index: segment.repeatIndex, total: segment.repeatTotal })
            : ''}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <AppBadge tone={paused ? 'warning' : 'primary'}>{t(paused ? 'session.paused' : 'session.running')}</AppBadge>
          <IconButton data-testid="guided-finish" label={t('session.finish')} className="h-10 w-10" onClick={onFinish}>
            <Square className="h-4 w-4" aria-hidden />
          </IconButton>
          <IconButton
            data-testid="guided-mute"
            label={t(muted ? 'session.unmute' : 'session.mute')}
            aria-pressed={muted}
            className="h-10 w-10"
            onClick={onToggleMute}
          >
            {muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
          </IconButton>
        </div>
      </div>
      <p className="mt-1 truncate text-caption text-text-muted">{workoutTitle}</p>

      {gpsEnabled && gpsFallback ? (
        <p
          data-testid="guided-gps-fallback"
          className="mt-4 rounded-xl border border-warning/40 bg-warning-soft px-3 py-2 text-center text-caption text-warning-ink"
        >
          {t('session.gpsFallback')}
        </p>
      ) : null}

      {gpsEnabled && !gpsFallback ? (
        <section className="mt-5 space-y-2">
          <div className="flex items-end justify-between gap-3">
            <p data-testid="guided-distance" className="num text-hero font-bold tracking-display">
              {formatKm(gpsDistanceKm)}
              <span className="text-lg font-semibold text-text-secondary"> km</span>
            </p>
            {plannedDistanceKm > 0 ? (
              <p className="num pb-1 text-caption text-text-muted">
                {t('session.of', { km: formatKm(plannedDistanceKm) })}
              </p>
            ) : null}
          </div>
          {plannedDistanceKm > 0 ? (
            <div
              data-testid="guided-progress"
              role="progressbar"
              aria-label={t('session.progress')}
              aria-valuemin={0}
              aria-valuemax={plannedDistanceKm}
              aria-valuenow={gpsDistanceKm}
              className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          ) : null}
          {gpsLost ? (
            <p
              data-testid="guided-gps-lost"
              role="status"
              className="rounded-full border border-warning/40 bg-warning-soft px-3 py-2 text-center text-caption font-medium text-warning-ink"
            >
              {t('session.gpsLost')}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <StatTile label={t('session.livePace')} value={livePaceText} />
            <StatTile label={t('session.avgPace')} value={avgPaceText} />
          </div>
          {splits.length > 0 ? (
            <ol data-testid="guided-splits" className="divide-y divide-border">
              {splits.map((split) => (
                <li
                  key={split.km}
                  data-testid={`guided-split-${split.km}`}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="num text-text-secondary">{t('session.split', { km: split.km })}</span>
                  <span className="num font-medium">{`${formatPace(split.paceSecPerKm)} /km`}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : null}

      <section className="mt-6 flex flex-col items-center gap-2 text-center">
        <p className="text-lg font-semibold">{segment.label}</p>
        {segment.paceLabel ? (
          <>
            <p className={clsx('num text-hero font-bold tracking-display', TONE_TEXT_CLASSES[tone])}>
              {segment.paceLabel}
              <span className="text-lg font-semibold text-text-secondary"> /km</span>
            </p>
            <p className="section-label">
              {t('session.goalPace')}
              {segment.estimated ? t('session.estimateSuffix') : ''}
            </p>
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
            <p className="section-label">{t('session.toEnd')}</p>
          </div>
        </ProgressRing>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <StatTile
          label={t('session.total')}
          value={<span data-testid="guided-elapsed">{formatDuration(Math.floor(elapsedSec))}</span>}
        />
        <StatTile
          label={t('session.distance')}
          value={gpsEnabled ? `${formatKm(gpsDistanceKm)} km` : `${formatKm(timeline.totalDistanceKm)} km`}
        />
        <StatTile label={t('session.pace')} value={segment.paceLabel ? `${segment.paceLabel} /km` : '—'} />
        <StatTile label={t('session.remaining')} value={formatDuration(Math.ceil(remainingSec))} />
        <StatTile label={t('session.stepLabel')} value={`${segment.index + 1}/${timeline.segments.length}`} />
        <StatTile
          label={t('session.next')}
          value={nextSegment ? nextSegment.label : t('session.end')}
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
