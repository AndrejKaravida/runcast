import {
  formatDuration,
  formatPace,
  predictRaceTimes,
  vdotFromPlan,
  type PlanAnchor,
  type PlanPaces,
} from '@runcast/shared';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppCard } from '@/components/ui/AppCard';

interface PredictorCardProps {
  paces: PlanPaces | null;
  anchor: PlanAnchor | null;
  raceDistanceKm: number | null;
}

const DISTANCE_LABELS = new Map<number, string>([
  [5, '5 km'],
  [10, '10 km'],
  [21.0975, 'Polumaraton'],
  [42.195, 'Maraton'],
]);

function labelFor(distanceKm: number): string {
  return DISTANCE_LABELS.get(distanceKm) ?? `${distanceKm} km`;
}

function isSameDistance(first: number, second: number): boolean {
  return Math.abs(first - second) < 0.01;
}

export function PredictorCard({ paces, anchor, raceDistanceKm }: PredictorCardProps) {
  const vdot = vdotFromPlan({ paces, anchor });

  if (vdot === null) {
    return (
      <AppCard data-testid="predictor-card" className="space-y-2">
        <p className="text-sm font-semibold">Predikcija trke</p>
        <p className="text-sm text-text-muted">Ubaci poslednju trku ili cilj — pokazaću ti predikciju.</p>
      </AppCard>
    );
  }

  const predictions = predictRaceTimes(vdot);

  return (
    <AppCard data-testid="predictor-card" className="space-y-2">
      <p className="text-sm font-semibold">Predikcija trke</p>
      <ul className="divide-y divide-border">
        {predictions.map((prediction) => {
          const isTarget = raceDistanceKm !== null && isSameDistance(raceDistanceKm, prediction.distanceKm);
          return isTarget ? (
            <li key={prediction.distanceKm} className="flex items-end justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block text-sm text-text-secondary">{labelFor(prediction.distanceKm)}</span>
                <AppBadge tone="primary" className="mt-1">
                  Tvoja trka
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
            ? 'Bazirano na ciljnom tempu — odražava cilj, ne garantuje trenutnu formu.'
            : `Bazirano na rezultatu: ${labelFor(anchor.distanceKm)} ${formatDuration(anchor.timeSec)}.`}
        </p>
      ) : null}
      <p className="text-caption text-text-muted">
        Procena po Daniels VDOT modelu — greška raste sa razlikom distanci (±2–4%).
      </p>
    </AppCard>
  );
}
