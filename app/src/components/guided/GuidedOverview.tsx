import { formatDuration, type GuidedTimeline } from '@runcast/shared';
import { ArrowLeft, MapPin, Play, Watch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatRow } from '@/components/ui/StatRow';
import { formatKm } from '@/components/guided/format';

interface GuidedOverviewProps {
  title: string;
  timeline: GuidedTimeline;
  speechAvailable: boolean;
  wakeLockSupported: boolean;
  gpsEnabled: boolean;
  exporting: boolean;
  exportingFit: boolean;
  onBack: () => void;
  onStart: () => void;
  onToggleGps: () => void;
  onExport: () => void;
  onExportFit: () => void;
}

export function GuidedOverview({
  title,
  timeline,
  speechAvailable,
  wakeLockSupported,
  gpsEnabled,
  exporting,
  exportingFit,
  onBack,
  onStart,
  onToggleGps,
  onExport,
  onExportFit,
}: GuidedOverviewProps) {
  const { t } = useTranslation('guided');
  const paceSegment = timeline.segments.find((segment) => segment.paceLabel);
  const statItems = [
    { label: t('stats.duration'), value: formatDuration(timeline.totalDurationSec) },
    ...(timeline.totalDistanceKm > 0
      ? [{ label: t('stats.distance'), value: `${formatKm(timeline.totalDistanceKm)} km` }]
      : []),
    ...(paceSegment?.paceLabel ? [{ label: t('stats.pace'), value: `${paceSegment.paceLabel} /km` }] : []),
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <AppButton variant="ghost" size="sm" className="-ml-2 w-auto" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> {t('common:actions.back')}
        </AppButton>
        {timeline.estimatedPaces ? <AppBadge tone="warning">{t('overview.estimate')}</AppBadge> : null}
      </div>

      <div className="mt-2 space-y-2">
        <p className="section-label">{t('overview.title')}</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-text-secondary">
          {t('overview.steps', { count: timeline.segments.length })}
          {speechAvailable ? '' : t('overview.noSpeechSuffix')}
        </p>
      </div>

      <StatRow items={statItems} className="mt-4 rounded-xl bg-surface-elevated py-1" />

      <section className="mt-5 space-y-1">
        <SectionHeader
          label={t('overview.stepsHeader')}
          action={<span className="num text-caption text-text-muted">{formatDuration(timeline.totalDurationSec)}</span>}
        />
        <ol className="divide-y divide-border">
          {timeline.segments.map((segment) => (
            <li key={segment.index} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {segment.label}
                  {segment.repeatIndex ? ` (${segment.repeatIndex}/${segment.repeatTotal})` : ''}
                </span>
                {segment.distanceKm ? (
                  <span className="num text-caption text-text-muted">{formatKm(segment.distanceKm)} km</span>
                ) : null}
              </span>
              <span className="num shrink-0 text-sm text-text-secondary">
                {segment.paceLabel ? `${segment.paceLabel} /km` : formatDuration(segment.durationSec)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {!speechAvailable || !wakeLockSupported ? (
        <p className="mt-3 text-caption text-text-muted">
          {!speechAvailable ? t('overview.speechUnavailable') : ''}
          {!speechAvailable && !wakeLockSupported ? ' ' : ''}
          {!wakeLockSupported ? t('overview.wakeLock') : ''}
        </p>
      ) : null}

      <div className="sticky bottom-0 mt-6 space-y-2 bg-bg/90 pb-2 pt-3 backdrop-blur-xl">
        <AppButton data-testid="guided-start" size="lg" className="w-full" onClick={onStart}>
          <Play className="h-5 w-5" aria-hidden /> {t('overview.start')}
        </AppButton>
        <AppButton
          data-testid="guided-gps"
          variant="secondary"
          className="w-full"
          aria-pressed={gpsEnabled}
          onClick={onToggleGps}
        >
          <MapPin className="h-4 w-4" aria-hidden /> {t(gpsEnabled ? 'overview.gpsOn' : 'overview.gpsOff')}
        </AppButton>
        <AppButton
          data-testid="guided-export-tcx"
          variant="secondary"
          className="w-full"
          loading={exporting}
          onClick={onExport}
        >
          <Watch className="h-4 w-4" aria-hidden /> {t('overview.exportTcx')}
        </AppButton>
        <AppButton
          data-testid="guided-export-fit"
          variant="secondary"
          className="w-full"
          loading={exportingFit}
          onClick={onExportFit}
        >
          <Watch className="h-4 w-4" aria-hidden /> {t('overview.exportFit')}
        </AppButton>
      </div>
    </div>
  );
}
