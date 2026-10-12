import { formatDuration, type GuidedTimeline } from '@runcast/shared';
import { ArrowLeft, MapPin, Play } from 'lucide-react';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
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
  return (
    <div className="mx-auto w-full max-w-[560px] space-y-4 px-4 py-6">
      <AppButton variant="ghost" size="sm" className="-ml-2 w-auto" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> Nazad
      </AppButton>
      <AppCard className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Vođeno trčanje</p>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          {timeline.estimatedPaces ? <AppBadge tone="warning">procena tempa</AppBadge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AppBadge tone="neutral">{formatDuration(timeline.totalDurationSec)}</AppBadge>
          {timeline.totalDistanceKm > 0 ? (
            <AppBadge tone="neutral">{formatKm(timeline.totalDistanceKm)} km</AppBadge>
          ) : null}
          <AppBadge tone="neutral">{timeline.segments.length} koraka</AppBadge>
        </div>
        <ul className="divide-y divide-border">
          {timeline.segments.map((segment) => (
            <li key={segment.index} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                {segment.label}
                {segment.repeatIndex ? ` (${segment.repeatIndex}/${segment.repeatTotal})` : ''}
              </span>
              <span className="shrink-0 text-text-muted">
                {formatDuration(segment.durationSec)}
                {segment.paceLabel ? ` · ${segment.paceLabel} /km` : ''}
              </span>
            </li>
          ))}
        </ul>
        {!speechAvailable ? (
          <p className="text-xs text-text-muted">
            Glasovno navođenje nije dostupno na ovom uređaju — koriste se zvuk i vizuelni prikaz.
          </p>
        ) : null}
        {!wakeLockSupported ? (
          <p className="text-xs text-text-muted">Drži ekran uključenim — zaključavanje prekida zvuk.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <AppButton data-testid="guided-start" className="flex-1" onClick={onStart}>
            <Play className="h-4 w-4" aria-hidden /> Počni vođeno trčanje
          </AppButton>
          <AppButton data-testid="guided-gps" variant="secondary" aria-pressed={gpsEnabled} onClick={onToggleGps}>
            <MapPin className="h-4 w-4" aria-hidden /> GPS
          </AppButton>
        </div>
      </AppCard>
    </div>
  );
}
