import {
  detectPersonalBests,
  formatDuration,
  STANDARD_RACE_KM,
  type PersonalBest,
  type PersonalBestLog,
} from '@runcast/shared';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppCard } from '@/components/ui/AppCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateShort } from '@/lib/dates';

interface PersonalBestsCardProps {
  logs: PersonalBestLog[];
}

export function PersonalBestsCard({ logs }: PersonalBestsCardProps) {
  const { t } = useTranslation('stats');
  const bests = new Map<number, PersonalBest>(detectPersonalBests(logs).map((best) => [best.distanceKm, best]));

  function labelFor(distanceKm: number): string {
    if (Math.abs(distanceKm - 21.0975) < 0.01) return t('distance.half');
    if (Math.abs(distanceKm - 42.195) < 0.01) return t('distance.marathon');
    return `${distanceKm} km`;
  }

  return (
    <AppCard data-testid="personal-bests-card" className="space-y-2">
      <p className="text-sm font-semibold">{t('pb.title')}</p>
      {bests.size === 0 ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title={t('pb.emptyTitle')}
          description={t('pb.emptyDescription')}
        />
      ) : (
        <ul className="divide-y divide-border">
          {STANDARD_RACE_KM.map((distanceKm) => {
            const best = bests.get(distanceKm);
            return (
              <li key={distanceKm} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-text-secondary">{labelFor(distanceKm)}</span>
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
      <p className="text-caption text-text-muted">{t('pb.footer')}</p>
    </AppCard>
  );
}
