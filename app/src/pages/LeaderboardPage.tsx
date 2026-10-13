import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { LeaderboardCard } from '@/components/social/LeaderboardCard';
import { AppButton } from '@/components/ui/AppButton';
import { QueryError } from '@/components/ui/QueryError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/auth/AuthProvider';
import { useLeaderboard } from '@/features/social/queries';
import { startOfWeekIso, todayIso } from '@/lib/dates';

export function LeaderboardPage() {
  const { t } = useTranslation('stats');
  const navigate = useNavigate();
  const { session } = useAuth();
  const { data = [], isLoading, isError, refetch } = useLeaderboard(startOfWeekIso(todayIso()));

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-5 px-4 py-6">
      <AppButton variant="ghost" size="sm" className="-ml-2 w-auto" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t('common:actions.back')}
      </AppButton>

      <div className="space-y-1">
        <SectionHeader label={t('leaderboard.title')} />
        <p className="text-sm text-text-secondary">{t('leaderboard.description')}</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : isError ? (
        <QueryError onRetry={() => void refetch()} />
      ) : session ? (
        <LeaderboardCard entries={data} currentUserId={session.user.id} />
      ) : null}
    </div>
  );
}
