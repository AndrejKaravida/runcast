import { formatDuration, type GuidedTimeline } from '@runcast/shared';
import { ArrowLeft, MapPin, Play } from 'lucide-react';
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
  onBack: () => void;
  onStart: () => void;
  onToggleGps: () => void;
}

export function GuidedOverview({
  title,
  timeline,
  speechAvailable,
  wakeLockSupported,
  gpsEnabled,
  onBack,
  onStart,
  onToggleGps,
}: GuidedOverviewProps) {
  const paceSegment = timeline.segments.find((segment) => segment.paceLabel);
  const statItems = [
    { label: 'Trajanje', value: formatDuration(timeline.totalDurationSec) },
    ...(timeline.totalDistanceKm > 0 ? [{ label: 'Distanca', value: `${formatKm(timeline.totalDistanceKm)} km` }] : []),
    ...(paceSegment?.paceLabel ? [{ label: 'Tempo', value: `${paceSegment.paceLabel} /km` }] : []),
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <AppButton variant="ghost" size="sm" className="-ml-2 w-auto" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Nazad
        </AppButton>
        {timeline.estimatedPaces ? <AppBadge tone="warning">procena tempa</AppBadge> : null}
      </div>

      <div className="mt-2 space-y-2">
        <p className="section-label">Vođeno trčanje</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-text-secondary">
          {timeline.segments.length} koraka
          {speechAvailable ? '' : ' · bez glasovnog navođenja'}
        </p>
      </div>

      <StatRow items={statItems} className="mt-4 rounded-xl bg-surface-elevated py-1" />

      <section className="mt-5 space-y-1">
        <SectionHeader
          label="Koraci"
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
          {!speechAvailable
            ? 'Glasovno navođenje nije dostupno na ovom uređaju — koriste se zvuk i vizuelni prikaz.'
            : ''}
          {!speechAvailable && !wakeLockSupported ? ' ' : ''}
          {!wakeLockSupported ? 'Drži ekran uključenim — zaključavanje prekida zvuk.' : ''}
        </p>
      ) : null}

      <div className="sticky bottom-0 mt-6 space-y-2 bg-bg/90 pb-2 pt-3 backdrop-blur-xl">
        <AppButton data-testid="guided-start" size="lg" className="w-full" onClick={onStart}>
          <Play className="h-5 w-5" aria-hidden /> Počni vođeno trčanje
        </AppButton>
        <AppButton
          data-testid="guided-gps"
          variant="secondary"
          className="w-full"
          aria-pressed={gpsEnabled}
          onClick={onToggleGps}
        >
          <MapPin className="h-4 w-4" aria-hidden /> GPS {gpsEnabled ? 'uključen' : 'isključen'}
        </AppButton>
      </div>
    </div>
  );
}
