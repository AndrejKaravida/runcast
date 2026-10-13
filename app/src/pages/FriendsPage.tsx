import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/QueryError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import {
  friendRequestErrorKey,
  useBlockUser,
  useFriendRequests,
  useFriends,
  useRemoveFriend,
  useRespondRequest,
  useSendFriendRequest,
  type FriendEntry,
} from '@/features/social/queries';

function FriendsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}

export function FriendsPage() {
  const { t } = useTranslation('social');
  const friends = useFriends();
  const requests = useFriendRequests();
  const sendRequest = useSendFriendRequest();
  const respondRequest = useRespondRequest();
  const removeFriend = useRemoveFriend();
  const blockUser = useBlockUser();

  const [name, setName] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<FriendEntry | null>(null);
  const [blockTarget, setBlockTarget] = useState<FriendEntry | null>(null);

  async function handleSend() {
    setError(null);
    setSent(false);
    try {
      await sendRequest.mutateAsync(name);
      setName('');
      setSent(true);
    } catch (caught) {
      setError(t(`add.errors.${friendRequestErrorKey(caught)}`));
    }
  }

  async function handleRemove() {
    const target = removeTarget;
    if (!target) return;
    try {
      await removeFriend.mutateAsync(target.friendshipId);
    } finally {
      setRemoveTarget(null);
    }
  }

  async function handleBlock() {
    const target = blockTarget;
    if (!target) return;
    try {
      await blockUser.mutateAsync(target.id);
    } finally {
      setBlockTarget(null);
    }
  }

  return (
    <SettingsSubpage title={t('title')}>
      <p className="text-sm text-text-secondary">{t('description')}</p>

      <div className="space-y-2">
        <SectionHeader label={t('requests.title')} />
        <p className="text-caption text-text-muted">{t('visibilityNote')}</p>
        {requests.isLoading ? (
          <FriendsSkeleton />
        ) : requests.isError ? (
          <QueryError onRetry={() => void requests.refetch()} />
        ) : requests.data && requests.data.length > 0 ? (
          requests.data.map((request) => (
            <div
              key={request.friendshipId}
              data-testid="friend-request-row"
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3"
            >
              <Avatar src={request.avatarUrl} name={request.displayName} className="h-9 w-9 text-sm" />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{request.displayName ?? t('anonymous')}</p>
              <AppButton
                size="sm"
                data-testid="friend-request-accept"
                loading={respondRequest.isPending && respondRequest.variables?.friendshipId === request.friendshipId}
                onClick={() => void respondRequest.mutateAsync({ friendshipId: request.friendshipId, accept: true })}
              >
                {t('requests.accept')}
              </AppButton>
              <AppButton
                size="sm"
                variant="ghost"
                data-testid="friend-request-decline"
                onClick={() => void respondRequest.mutateAsync({ friendshipId: request.friendshipId, accept: false })}
              >
                {t('requests.decline')}
              </AppButton>
            </div>
          ))
        ) : (
          <p className="text-sm text-text-muted">{t('requests.empty')}</p>
        )}
      </div>

      <AppCard className="space-y-3">
        <SectionHeader label={t('add.title')} />
        <AppInput
          label={t('add.label')}
          hint={t('add.hint')}
          value={name}
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value);
            setSent(false);
            setError(null);
          }}
        />
        <AppButton
          onClick={() => void handleSend()}
          loading={sendRequest.isPending}
          disabled={name.trim().length === 0}
          data-testid="friend-add-submit"
        >
          {t('add.action')}
        </AppButton>
        {sent ? (
          <p className="rounded-xl border border-success/40 bg-success-soft px-3 py-2 text-sm text-success-ink">
            {t('add.sent')}
          </p>
        ) : null}
        {error ? (
          <p
            data-testid="friend-add-error"
            className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink"
          >
            {error}
          </p>
        ) : null}
      </AppCard>

      <div className="space-y-2">
        <SectionHeader label={t('friends.title')} />
        <p className="text-caption text-text-muted">{t('visibilityNote')}</p>
        {friends.isLoading ? (
          <FriendsSkeleton />
        ) : friends.isError ? (
          <QueryError onRetry={() => void friends.refetch()} />
        ) : friends.data && friends.data.length > 0 ? (
          friends.data.map((friend) => (
            <div
              key={friend.friendshipId}
              data-testid="friend-row"
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3"
            >
              <Avatar src={friend.avatarUrl} name={friend.displayName} className="h-9 w-9 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{friend.displayName ?? t('anonymous')}</p>
                <p className="num text-caption text-text-muted">{t('friends.weeklyKm', { km: friend.weeklyKm })}</p>
              </div>
              <AppButton size="sm" variant="ghost" data-testid="friend-remove" onClick={() => setRemoveTarget(friend)}>
                {t('friends.remove')}
              </AppButton>
              <AppButton
                size="sm"
                variant="ghost"
                className="text-danger-ink"
                data-testid="friend-block"
                onClick={() => setBlockTarget(friend)}
              >
                {t('friends.block')}
              </AppButton>
            </div>
          ))
        ) : (
          <EmptyState title={t('friends.emptyTitle')} description={t('friends.emptyDescription')} />
        )}
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        title={t('friends.removeTitle')}
        description={t('friends.removeDescription', { name: removeTarget?.displayName ?? t('anonymous') })}
        confirmLabel={t('friends.remove')}
        tone="danger"
        loading={removeFriend.isPending}
        onConfirm={() => void handleRemove()}
        onClose={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={blockTarget !== null}
        title={t('friends.blockTitle')}
        description={t('friends.blockDescription', { name: blockTarget?.displayName ?? t('anonymous') })}
        confirmLabel={t('friends.block')}
        tone="danger"
        loading={blockUser.isPending}
        onConfirm={() => void handleBlock()}
        onClose={() => setBlockTarget(null)}
      />
    </SettingsSubpage>
  );
}
