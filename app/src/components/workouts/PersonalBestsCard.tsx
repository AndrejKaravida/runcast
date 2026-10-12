import {
  detectPersonalBests,
  formatDuration,
  STANDARD_RACE_KM,
  type PersonalBest,
  type PersonalBestLog,
} from '@runcast/shared';
import { Trophy } from 'lucide-react';
import { AppCard } from '@/components/ui/AppCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateShort } from '@/lib/dates';

interface PersonalBestsCardProps {
  logs: PersonalBestLog[];
}

const DISTANCE_LABELS = new Map<number, string>([
  [5, '5 km'],
  [10, '10 km'],
  [21.0975, 'Polumaraton'],
  [42.195, 'Maraton'],
]);

export function PersonalBestsCard({ logs }: PersonalBestsCardProps) {
  const bests = new Map<number, PersonalBest>(detectPersonalBests(logs).map((best) => [best.distanceKm, best]));

  return (
    <AppCard data-testid="personal-bests-card" className="space-y-2">
      <p className="text-sm font-semibold">Lični rekordi</p>
      {bests.size === 0 ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="Rekorda još nema"
          description="Zabeleži trku na 5, 10 ili 21 km — prvi rekord je uvek najslađi."
        />
      ) : (
        <ul className="divide-y divide-border">
          {STANDARD_RACE_KM.map((distanceKm) => {
            const best = bests.get(distanceKm);
            return (
              <li key={distanceKm} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-text-secondary">{DISTANCE_LABELS.get(distanceKm)}</span>
                {best ? (
                  <span className="flex items-center gap-3">
                    <span className="num text-caption text-text-muted">{formatDateShort(best.logDate)}</span>
                    <span className="num font-semibold">{formatDuration(best.timeSec)}</span>
                  </span>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-caption text-text-muted">Automatski iz zabeleženih treninga (±2% tolerancije).</p>
    </AppCard>
  );
}
