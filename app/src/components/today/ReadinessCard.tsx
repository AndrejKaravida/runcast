import { fmtKm, type ReadinessLevel } from '@runcast/shared';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppCard } from '@/components/ui/AppCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useReadiness } from '@/features/health/queries';

const LEVEL_TONES: Record<ReadinessLevel, 'success' | 'neutral' | 'warning'> = {
  fresh: 'success',
  normal: 'neutral',
  tired: 'warning',
};

function ReadinessSkeleton() {
  return (
    <AppCard data-testid="readiness-skeleton" className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-4 w-44" />
      <Skeleton className="h-3 w-56" />
    </AppCard>
  );
}

interface ReadinessCardProps {
  hideHints?: boolean;
}

export function ReadinessCard({ hideHints = false }: ReadinessCardProps) {
  const { t } = useTranslation('today');
  const { data, isLoading, autosync } = useReadiness();

  if (!autosync) return null;
  if (isLoading) return <ReadinessSkeleton />;
  if (!data) return null;

  const { snapshot, readiness } = data;
  const hasMetrics = snapshot.sleepHours !== null || snapshot.hrv !== null || snapshot.restingHr !== null;

  return (
    <AppCard data-testid="readiness-card" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t('readiness.title')}</p>
        <span data-testid="readiness-level">
          <AppBadge tone={LEVEL_TONES[readiness.level]}>{t(`readiness.level.${readiness.level}`)}</AppBadge>
        </span>
      </div>
      {hasMetrics ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {snapshot.sleepHours !== null ? (
            <span data-testid="readiness-sleep">{t('readiness.sleep', { hours: fmtKm(snapshot.sleepHours) })}</span>
          ) : null}
          {snapshot.hrv !== null ? (
            <span className="num text-text-secondary">{t('readiness.hrv', { value: Math.round(snapshot.hrv) })}</span>
          ) : null}
          {snapshot.restingHr !== null ? (
            <span className="num text-text-secondary">
              {t('readiness.rhr', { value: Math.round(snapshot.restingHr) })}
            </span>
          ) : null}
        </div>
      ) : null}
      {!hideHints
        ? readiness.hints.map((hint) => (
            <p key={hint.key} className="text-caption text-text-muted">
              {t(hint.key, hint.params)}
            </p>
          ))
        : null}
    </AppCard>
  );
}
