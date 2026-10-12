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
        <p className="text-sm text-text-muted">Dodaj poslednju trku ili ciljno vreme da dobiješ predikciju.</p>
      </AppCard>
    );
  }

  return (
    <AppCard data-testid="predictor-card" className="space-y-2">
      <p className="text-sm font-semibold">Predikcija trke</p>
      <ul className="divide-y divide-border">
        {predictRaceTimes(vdot).map((prediction) => (
          <li key={prediction.distanceKm} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span className="flex items-center gap-2 text-text-secondary">
              {labelFor(prediction.distanceKm)}
              {raceDistanceKm !== null && isSameDistance(raceDistanceKm, prediction.distanceKm) ? (
                <AppBadge tone="primary">Tvoja trka</AppBadge>
              ) : null}
            </span>
            <span className="flex items-center gap-3">
              <span className="font-semibold">{formatDuration(prediction.timeSec)}</span>
              <span className="text-text-muted">{formatPace(prediction.paceSecPerKm)} /km</span>
            </span>
          </li>
        ))}
      </ul>
      {anchor ? (
        <p className="text-[11px] text-text-muted">
          {anchor.kind === 'goal'
            ? 'Bazirano na ciljnom tempu — odražava cilj, ne garantuje trenutnu formu.'
            : `Bazirano na rezultatu: ${labelFor(anchor.distanceKm)} ${formatDuration(anchor.timeSec)}.`}
        </p>
      ) : null}
      <p className="text-[11px] text-text-muted">
        Procena po Daniels VDOT modelu — greška raste sa razlikom distanci (±2–4%).
      </p>
    </AppCard>
  );
}
