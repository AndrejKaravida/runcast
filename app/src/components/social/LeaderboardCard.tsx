import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AdherenceLeaderboardEntry, LeaderboardEntry } from '@/features/social/queries';

type LeaderboardCardEntry = LeaderboardEntry | AdherenceLeaderboardEntry;

interface LeaderboardCardProps {
  entries: LeaderboardCardEntry[];
  currentUserId: string;
  metric?: 'km' | 'adherence';
}

function Row({ entry, isMe }: { entry: LeaderboardCardEntry; isMe: boolean }) {
  const { t } = useTranslation('stats');
  return (
    <div
      data-testid="leaderboard-row"
      className={clsx(
        'flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5',
        isMe && 'border-primary/40 bg-primary-soft',
      )}
    >
      <span className="num w-6 shrink-0 text-center text-sm font-semibold text-text-muted">{entry.rank ?? '—'}</span>
      <Avatar src={entry.avatar_url} name={entry.display_name} className="h-9 w-9 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.display_name ?? t('leaderboard.anonymous')}</p>
        <p className="num text-caption text-text-muted">
          {'adherence' in entry
            ? t('leaderboard.adherenceCaption', {
                done: entry.done,
                prescribed: entry.prescribed,
                km: entry.distance_km,
              })
            : `${entry.distance_km} km · ${
                entry.sessions === 1
                  ? t('leaderboard.sessionsOne', { count: entry.sessions })
                  : t('leaderboard.sessionsMany', { count: entry.sessions })
              }`}
        </p>
      </div>
      {'adherence' in entry ? (
        <AppBadge tone="primary">{t('leaderboard.adherenceBadge', { percent: entry.adherence })}</AppBadge>
      ) : null}
      {isMe ? <AppBadge tone="primary">{t('leaderboard.you')}</AppBadge> : null}
    </div>
  );
}

export function LeaderboardCard({ entries, currentUserId, metric = 'km' }: LeaderboardCardProps) {
  const { t } = useTranslation('stats');
  const publicEntries = entries.filter((entry) => entry.is_public);
  const me = entries.find((entry) => entry.user_id === currentUserId) ?? null;
  const meOutsideTop = publicEntries.length > 20 && me?.is_public === true;

  if (publicEntries.length === 0) {
    return metric === 'adherence' ? (
      <EmptyState
        title={t('leaderboard.adherenceEmptyTitle')}
        description={t('leaderboard.adherenceEmptyDescription')}
      />
    ) : (
      <EmptyState
        title={t('leaderboard.emptyTitle')}
        description={t('leaderboard.emptyDescription')}
        action={
          <Link to="/settings">
            <AppButton size="sm">{t('leaderboard.emptyAction')}</AppButton>
          </Link>
        }
      />
    );
  }

  const visible = meOutsideTop ? publicEntries.filter((entry) => entry.user_id !== currentUserId) : publicEntries;
  const sorted = [...visible].sort(
    (first, second) =>
      (first.rank ?? 0) - (second.rank ?? 0) ||
      second.distance_km - first.distance_km ||
      (first.display_name ?? '').localeCompare(second.display_name ?? ''),
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {sorted.map((entry) => (
          <Row key={entry.user_id} entry={entry} isMe={entry.user_id === currentUserId} />
        ))}
        {meOutsideTop && me ? (
          <>
            <div className="border-t border-dashed border-border" />
            <Row entry={me} isMe />
          </>
        ) : null}
      </div>
      <p className="text-caption text-text-muted">
        {me && !me.is_public ? (
          <>
            {t('leaderboard.notPublic')}{' '}
            <Link to="/settings" className="font-medium text-primary-ink">
              {t('leaderboard.emptyAction')}
            </Link>
          </>
        ) : me ? (
          'adherence' in me ? (
            t('leaderboard.rank', { rank: me.rank })
          ) : me.distance_km > 0 ? (
            t('leaderboard.rank', { rank: me.rank })
          ) : (
            t('leaderboard.noKm')
          )
        ) : (
          t('leaderboard.adherenceSelfEmpty')
        )}
      </p>
    </div>
  );
}
