import { ThumbsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDuration, formatPace } from '@runcast/shared';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useKudos, type FeedItem } from '@/features/social/queries';
import { formatDateShort } from '@/lib/dates';

interface FriendsFeedProps {
  items: FeedItem[];
}

export function FriendsFeed({ items }: FriendsFeedProps) {
  const { t } = useTranslation('social');
  const kudos = useKudos();

  if (items.length === 0) {
    return <EmptyState title={t('feed.emptyTitle')} description={t('feed.emptyDescription')} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AppCard key={item.id} className="space-y-3" data-testid="feed-card">
          <div className="flex items-center gap-3">
            <Avatar src={item.avatarUrl} name={item.displayName} className="h-9 w-9 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.displayName ?? t('feed.anonymous')}</p>
              <p className="text-caption text-text-muted">{formatDateShort(item.logDate)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {item.distanceKm !== null ? <span className="num font-semibold">{item.distanceKm} km</span> : null}
            {item.durationSec !== null ? (
              <span className="num text-text-secondary">{formatDuration(item.durationSec)}</span>
            ) : null}
            {item.paceSecPerKm !== null ? (
              <span className="num text-text-secondary">{formatPace(item.paceSecPerKm)} /km</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <AppButton
              size="sm"
              variant={item.kudosByMe ? 'primary' : 'secondary'}
              aria-pressed={item.kudosByMe}
              loading={kudos.isPending && kudos.variables?.runLogId === item.id}
              onClick={() => kudos.mutate({ runLogId: item.id, liked: item.kudosByMe })}
              data-testid="kudos-button"
            >
              <ThumbsUp className="h-4 w-4" aria-hidden />
              {t('feed.kudos')}
            </AppButton>
            <span data-testid="kudos-count" className="num text-sm text-text-secondary">
              {item.kudosCount}
            </span>
          </div>
        </AppCard>
      ))}
    </div>
  );
}
