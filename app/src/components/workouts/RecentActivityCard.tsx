import { formatPace } from '@runcast/shared';
import { Link } from 'react-router';
import { AppCard } from '@/components/ui/AppCard';
import { formatDateShort } from '@/lib/dates';
import type { RunLogsRow } from '@/types';

export function RecentActivityCard({ logs }: { logs: RunLogsRow[] }) {
  if (logs.length === 0) return null;
  return (
    <AppCard data-testid="recent-activity" className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Poslednje aktivnosti</p>
        <Link to="/stats" className="text-sm font-medium text-primary hover:text-primary-pressed">
          Sve
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {logs.slice(0, 2).map((log) => (
          <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span className="text-text-secondary">{formatDateShort(log.log_date)}</span>
            <span className="flex flex-wrap items-center justify-end gap-3">
              {log.distance_km ? <span className="font-medium">{log.distance_km} km</span> : null}
              {log.avg_pace_sec_per_km ? (
                <span className="text-text-muted">{formatPace(log.avg_pace_sec_per_km)} /km</span>
              ) : null}
              {log.rpe ? <span className="text-primary">RPE {log.rpe}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </AppCard>
  );
}
