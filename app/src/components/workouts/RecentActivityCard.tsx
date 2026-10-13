import { formatPace } from '@runcast/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ListRow } from '@/components/ui/ListRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateShort } from '@/lib/dates';
import type { RunLogsRow } from '@/types';

const SKELETON_ROWS = [0, 1];

function RecentActivitySkeleton() {
  return (
    <div data-testid="recent-activity-skeleton" className="space-y-2">
      <Skeleton className="h-5 w-28" />
      <div className="space-y-2">
        {SKELETON_ROWS.map((row) => (
          <div key={row} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentActivityCard({ logs, isLoading = false }: { logs: RunLogsRow[]; isLoading?: boolean }) {
  const { t } = useTranslation('workout');
  if (isLoading) return <RecentActivitySkeleton />;
  if (logs.length === 0) return null;
  return (
    <div data-testid="recent-activity" className="space-y-2">
      <SectionHeader
        label={t('recent.title')}
        action={
          <Link to="/stats" className="text-sm font-medium text-primary-ink hover:text-primary-ink-hover">
            {t('recent.all')}
          </Link>
        }
      />
      <div className="space-y-2">
        {logs.slice(0, 2).map((log) => (
          <ListRow
            key={log.id}
            eyebrow={formatDateShort(log.log_date)}
            title={log.distance_km ? `${log.distance_km} km` : t('recent.workout')}
            value={
              <>
                {log.avg_pace_sec_per_km ? <span>{formatPace(log.avg_pace_sec_per_km)} /km</span> : null}
                {log.rpe ? <span className="text-primary-ink">RPE {log.rpe}</span> : null}
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}
