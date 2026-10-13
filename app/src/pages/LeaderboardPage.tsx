import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { FriendsFeed } from '@/components/social/FriendsFeed';
import { FriendsLeaderboardCard } from '@/components/social/FriendsLeaderboardCard';
import { LeaderboardCard } from '@/components/social/LeaderboardCard';
import { AppButton } from '@/components/ui/AppButton';
import { QueryError } from '@/components/ui/QueryError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/auth/AuthProvider';
import { useFriendsFeed, useFriendsLeaderboard, useLeaderboard } from '@/features/social/queries';
import { startOfWeekIso, todayIso } from '@/lib/dates';

type LeaderboardTab = 'global' | 'friends' | 'feed';

function LeaderboardSkeleton() {
  return (
    <div data-testid="leaderboard-skeleton" className="space-y-3">
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

export function LeaderboardPage() {
  const { t } = useTranslation('stats');
  const { t: tSocial } = useTranslation('social');
  const navigate = useNavigate();
  const { session } = useAuth();
  const [tab, setTab] = useState<LeaderboardTab>('global');
  const weekStart = startOfWeekIso(todayIso());
  const global = useLeaderboard(weekStart);
  const friends = useFriendsLeaderboard(weekStart);
  const feed = useFriendsFeed();

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-5 px-4 py-6">
      <AppButton variant="ghost" size="sm" className="-ml-2 w-auto" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t('common:actions.back')}
      </AppButton>

      <div className="space-y-1">
        <SectionHeader
          label={t('leaderboard.title')}
          action={
            <Link to="/friends" className="text-caption font-semibold text-primary-ink">
              {tSocial('title')}
            </Link>
          }
        />
        <p className="text-sm text-text-secondary">{t('leaderboard.description')}</p>
      </div>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'global', label: t('leaderboard.tabGlobal') },
          { value: 'friends', label: t('leaderboard.tabFriends') },
          { value: 'feed', label: t('leaderboard.tabFeed') },
        ]}
      />

      {tab === 'global' ? (
        global.isLoading ? (
          <LeaderboardSkeleton />
        ) : global.isError ? (
          <QueryError onRetry={() => void global.refetch()} />
        ) : session ? (
          <LeaderboardCard entries={global.data ?? []} currentUserId={session.user.id} />
        ) : null
      ) : tab === 'friends' ? (
        friends.isLoading ? (
          <LeaderboardSkeleton />
        ) : friends.isError ? (
          <QueryError onRetry={() => void friends.refetch()} />
        ) : session ? (
          <FriendsLeaderboardCard entries={friends.data ?? []} currentUserId={session.user.id} />
        ) : null
      ) : feed.isLoading ? (
        <LeaderboardSkeleton />
      ) : feed.isError ? (
        <QueryError onRetry={() => void feed.refetch()} />
      ) : (
        <FriendsFeed items={feed.data ?? []} />
      )}
    </div>
  );
}
