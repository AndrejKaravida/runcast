import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import type { FriendsLeaderboardEntry } from '@/features/social/queries';

interface FriendsLeaderboardCardProps {
  entries: FriendsLeaderboardEntry[];
  currentUserId: string;
}

export function FriendsLeaderboardCard({ entries, currentUserId }: FriendsLeaderboardCardProps) {
  const { t } = useTranslation('stats');
  const { t: tSocial } = useTranslation('social');

  if (entries.length <= 1) {
    return (
      <EmptyState
        title={tSocial('friends.emptyTitle')}
        description={tSocial('friends.emptyDescription')}
        action={
          <Link to="/friends">
            <AppButton size="sm">{tSocial('friends.emptyAction')}</AppButton>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const sessions =
          entry.sessions === 1
            ? t('leaderboard.sessionsOne', { count: entry.sessions })
            : t('leaderboard.sessionsMany', { count: entry.sessions });
        const isMe = entry.user_id === currentUserId;
        return (
          <div
            key={entry.user_id}
            data-testid="friends-leaderboard-row"
            className={clsx(
              'flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5',
              isMe && 'border-primary/40 bg-primary-soft',
            )}
          >
            <span className="num w-6 shrink-0 text-center text-sm font-semibold text-text-muted">{entry.rank}</span>
            <Avatar src={entry.avatar_url} name={entry.display_name} className="h-9 w-9 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{entry.display_name ?? t('leaderboard.anonymous')}</p>
              <p className="num text-caption text-text-muted">
                {entry.distance_km} km · {sessions}
              </p>
            </div>
            {isMe ? <AppBadge tone="primary">{t('leaderboard.you')}</AppBadge> : null}
          </div>
        );
      })}
    </div>
  );
}
