import {
  formatDuration,
  formatPace,
  predictRaceTimes,
  vdotFromPlan,
  type PlanAnchor,
  type PlanPaces,
} from '@runcast/shared';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppCard } from '@/components/ui/AppCard';

interface PredictorCardProps {
  paces: PlanPaces | null;
  anchor: PlanAnchor | null;
  raceDistanceKm: number | null;
}

function isSameDistance(first: number, second: number): boolean {
  return Math.abs(first - second) < 0.01;
}

export function PredictorCard({ paces, anchor, raceDistanceKm }: PredictorCardProps) {
  const { t } = useTranslation('stats');
  const vdot = vdotFromPlan({ paces, anchor });

  function labelFor(distanceKm: number): string {
    if (isSameDistance(distanceKm, 21.0975)) return t('distance.half');
    if (isSameDistance(distanceKm, 42.195)) return t('distance.marathon');
    return `${distanceKm} km`;
  }

  const predictions = vdot === null ? null : predictRaceTimes(vdot);

  if (vdot === null || predictions === null) {
    return (
      <AppCard data-testid="predictor-card" className="space-y-2">
        <p className="text-sm font-semibold">{t('predictor.title')}</p>
        <p className="text-sm text-text-muted">{t(vdot === null ? 'predictor.empty' : 'predictor.outOfRange')}</p>
      </AppCard>
    );
  }

  return (
    <AppCard data-testid="predictor-card" className="space-y-2">
      <p className="text-sm font-semibold">{t('predictor.title')}</p>
      <ul className="divide-y divide-border">
        {predictions.map((prediction) => {
          const isTarget = raceDistanceKm !== null && isSameDistance(raceDistanceKm, prediction.distanceKm);
          return isTarget ? (
            <li key={prediction.distanceKm} className="flex items-end justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block text-sm text-text-secondary">{labelFor(prediction.distanceKm)}</span>
                <AppBadge tone="primary" className="mt-1">
                  {t('predictor.yourRace')}
                </AppBadge>
              </span>
              <span className="shrink-0 text-right">
                <span className="num block text-stat font-semibold">{formatDuration(prediction.timeSec)}</span>
                <span className="num block text-caption text-text-muted">
                  {formatPace(prediction.paceSecPerKm)} /km
                </span>
              </span>
            </li>
          ) : (
            <li key={prediction.distanceKm} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-text-secondary">{labelFor(prediction.distanceKm)}</span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="num font-medium">{formatDuration(prediction.timeSec)}</span>
                <span className="num text-text-muted">{formatPace(prediction.paceSecPerKm)} /km</span>
              </span>
            </li>
          );
        })}
      </ul>
      {anchor ? (
        <p className="text-caption text-text-muted">
          {anchor.kind === 'goal'
            ? t('predictor.goalNote')
            : t('predictor.anchorNote', {
                distance: labelFor(anchor.distanceKm),
                time: formatDuration(anchor.timeSec),
              })}
        </p>
      ) : null}
      <p className="text-caption text-text-muted">{t('predictor.method')}</p>
    </AppCard>
  );
}
