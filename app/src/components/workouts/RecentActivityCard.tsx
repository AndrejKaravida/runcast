import { formatPace } from '@runcast/shared';
import { Link } from 'react-router';
import { ListRow } from '@/components/ui/ListRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatDateShort } from '@/lib/dates';
import type { RunLogsRow } from '@/types';

export function RecentActivityCard({ logs }: { logs: RunLogsRow[] }) {
  if (logs.length === 0) return null;
  return (
    <div data-testid="recent-activity" className="space-y-2">
      <SectionHeader
        label="Poslednje aktivnosti"
        action={
          <Link to="/stats" className="text-sm font-medium text-primary-ink hover:text-primary-ink-hover">
            Sve
          </Link>
        }
      />
      <div className="space-y-2">
        {logs.slice(0, 2).map((log) => (
          <ListRow
            key={log.id}
            eyebrow={formatDateShort(log.log_date)}
            title={log.distance_km ? `${log.distance_km} km` : 'Trening'}
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
