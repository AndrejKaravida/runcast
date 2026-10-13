import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { endOfWeekIso, startOfWeekIso, todayIso } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types';

export type LeaderboardEntry = Database['public']['Functions']['weekly_leaderboard']['Returns'][number];
export type FriendsLeaderboardEntry = Database['public']['Functions']['friends_weekly_leaderboard']['Returns'][number];
export type AdherenceLeaderboardEntry =
  Database['public']['Functions']['adherence_weekly_leaderboard']['Returns'][number];

type FriendshipsRow = Database['public']['Tables']['friendships']['Row'];

const REQUEST_DAILY_LIMIT = 20;
const REQUEST_PENDING_LIMIT = 100;

function friendIdsFrom(friendships: FriendshipsRow[], userId: string): string[] {
  return friendships.map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id));
}

function pairFilterFor(firstId: string, secondId: string): string {
  return `and(requester_id.eq.${firstId},addressee_id.eq.${secondId}),and(requester_id.eq.${secondId},addressee_id.eq.${firstId})`;
}

export function useLeaderboard(weekStart: string) {
  return useQuery({
    queryKey: ['leaderboard', weekStart],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase.rpc('weekly_leaderboard', { p_week_start: weekStart });
      if (error) throw error;
      return data;
    },
  });
}

export function useFriendsLeaderboard(weekStart: string) {
  return useQuery({
    queryKey: ['friends-leaderboard', weekStart],
    queryFn: async (): Promise<FriendsLeaderboardEntry[]> => {
      const { data, error } = await supabase.rpc('friends_weekly_leaderboard', { p_week_start: weekStart });
      if (error) throw error;
      return data;
    },
  });
}

export function useAdherenceLeaderboard(weekStart: string, scope: 'global' | 'friends', enabled = true) {
  return useQuery({
    queryKey: ['adherence-leaderboard', scope, weekStart],
    enabled,
    queryFn: async (): Promise<AdherenceLeaderboardEntry[]> => {
      const { data, error } =
        scope === 'global'
          ? await supabase.rpc('adherence_weekly_leaderboard', { p_week_start: weekStart })
          : await supabase.rpc('friends_adherence_leaderboard', { p_week_start: weekStart });
      if (error) throw error;
      return data;
    },
  });
}

export interface FriendEntry {
  friendshipId: string;
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  username: string | null;
  weeklyKm: number;
}

export function useFriends() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['friends', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<FriendEntry[]> => {
      const { data: friendships, error } = await supabase.from('friendships').select('*').eq('status', 'accepted');
      if (error) throw error;
      const ids = friendIdsFrom(friendships, userId as string);
      if (ids.length === 0) return [];
      const [profiles, logs] = await Promise.all([
        supabase.from('profiles').select('id, display_name, avatar_url, username').in('id', ids),
        supabase
          .from('run_logs')
          .select('user_id, distance_km')
          .in('user_id', ids)
          .gte('log_date', startOfWeekIso(todayIso()))
          .lte('log_date', endOfWeekIso(todayIso())),
      ]);
      if (profiles.error) throw profiles.error;
      if (logs.error) throw logs.error;
      const profileById = new Map(profiles.data.map((profile) => [profile.id, profile]));
      const kmByUser = new Map<string, number>();
      for (const log of logs.data) {
        kmByUser.set(log.user_id, (kmByUser.get(log.user_id) ?? 0) + (log.distance_km ?? 0));
      }
      const friendshipIdByUser = new Map(
        friendships.map((row) => [row.requester_id === userId ? row.addressee_id : row.requester_id, row.id]),
      );
      return ids
        .map((id) => ({
          friendshipId: friendshipIdByUser.get(id) as string,
          id,
          displayName: profileById.get(id)?.display_name ?? null,
          avatarUrl: profileById.get(id)?.avatar_url ?? null,
          username: profileById.get(id)?.username ?? null,
          weeklyKm: Math.round((kmByUser.get(id) ?? 0) * 10) / 10,
        }))
        .sort((first, second) => (first.displayName ?? '').localeCompare(second.displayName ?? ''));
    },
  });
}

export interface FriendRequestEntry {
  friendshipId: string;
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  username: string | null;
}

export function useFriendRequests() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['friend-requests', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<FriendRequestEntry[]> => {
      const { data: requests, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('addressee_id', userId as string)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (requests.length === 0) return [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username')
        .in(
          'id',
          requests.map((request) => request.requester_id),
        );
      if (profilesError) throw profilesError;
      const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
      return requests.map((request) => ({
        friendshipId: request.id,
        id: request.requester_id,
        displayName: profileById.get(request.requester_id)?.display_name ?? null,
        avatarUrl: profileById.get(request.requester_id)?.avatar_url ?? null,
        username: profileById.get(request.requester_id)?.username ?? null,
      }));
    },
  });
}

const friendRequestErrorKeys = {
  'not-found': 'notFound',
  self: 'self',
  already: 'already',
  blocked: 'blocked',
  'pending-limit': 'pendingLimit',
  'daily-limit': 'dailyLimit',
} as const;

export type FriendRequestError = keyof typeof friendRequestErrorKeys;

export function friendRequestErrorKey(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return message in friendRequestErrorKeys ? friendRequestErrorKeys[message as FriendRequestError] : 'failed';
}

async function invalidateSocial(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['friend-requests'] }),
    queryClient.invalidateQueries({ queryKey: ['friends'] }),
    queryClient.invalidateQueries({ queryKey: ['friends-feed'] }),
    queryClient.invalidateQueries({ queryKey: ['friends-leaderboard'] }),
    queryClient.invalidateQueries({ queryKey: ['adherence-leaderboard'] }),
  ]);
}

export function useSendFriendRequest() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async (query: string) => {
      if (!userId) throw new Error('not-authenticated');
      const { data: matches, error: findError } = await supabase.rpc('find_profile_by_handle', { p_query: query });
      if (findError) throw findError;
      const target = matches[0];
      if (!target) throw new Error('not-found');
      if (target.id === userId) throw new Error('self');
      const { data: blocked, error: blockedError } = await supabase.rpc('is_blocked_with', {
        p_other_id: target.id,
      });
      if (blockedError) throw blockedError;
      if (blocked) throw new Error('blocked');
      const { data: existing, error: existingError } = await supabase
        .from('friendships')
        .select('id')
        .or(pairFilterFor(userId, target.id))
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) throw new Error('already');
      const { count: pendingCount, error: pendingError } = await supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('requester_id', userId)
        .eq('status', 'pending');
      if (pendingError) throw pendingError;
      if ((pendingCount ?? 0) >= REQUEST_PENDING_LIMIT) throw new Error('pending-limit');
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count: dailyCount, error: dailyError } = await supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('requester_id', userId)
        .gte('created_at', startOfDay.toISOString());
      if (dailyError) throw dailyError;
      if ((dailyCount ?? 0) >= REQUEST_DAILY_LIMIT) throw new Error('daily-limit');
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({ requester_id: userId, addressee_id: target.id, status: 'pending' });
      if (insertError) throw insertError;
    },
    onSuccess: () => invalidateSocial(queryClient),
  });
}

export function useRespondRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ friendshipId, accept }: { friendshipId: string; accept: boolean }) => {
      if (accept) {
        const { data, error } = await supabase
          .from('friendships')
          .update({ status: 'accepted', responded_at: new Date().toISOString() })
          .eq('id', friendshipId)
          .select('id')
          .single();
        if (error) throw error;
        if (!data) throw new Error('request-not-updated');
        return;
      }
      const { data, error } = await supabase.from('friendships').delete().eq('id', friendshipId).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('request-not-updated');
    },
    onSuccess: () => invalidateSocial(queryClient),
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { data, error } = await supabase.from('friendships').delete().eq('id', friendshipId).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('friend-not-removed');
    },
    onSuccess: () => invalidateSocial(queryClient),
  });
}

export function useBlockUser() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!userId) throw new Error('not-authenticated');
      const { error: deleteError } = await supabase
        .from('friendships')
        .delete()
        .or(pairFilterFor(userId, targetUserId));
      if (deleteError) throw deleteError;
      const { error: blockError } = await supabase
        .from('blocks')
        .insert({ blocker_id: userId, blocked_id: targetUserId });
      if (blockError && blockError.code !== '23505') throw blockError;
    },
    onSuccess: () => invalidateSocial(queryClient),
  });
}

export interface FeedItem {
  id: string;
  userId: string;
  logDate: string;
  distanceKm: number | null;
  durationSec: number | null;
  paceSecPerKm: number | null;
  displayName: string | null;
  avatarUrl: string | null;
  kudosCount: number;
  kudosByMe: boolean;
}

export function useFriendsFeed(limit = 20) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['friends-feed', userId, limit],
    enabled: Boolean(userId),
    queryFn: async (): Promise<FeedItem[]> => {
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted');
      if (friendshipsError) throw friendshipsError;
      const ids = friendIdsFrom(friendships, userId as string);
      if (ids.length === 0) return [];
      const { data: logs, error: logsError } = await supabase
        .from('run_logs')
        .select('id, user_id, log_date, distance_km, duration_sec, avg_pace_sec_per_km')
        .in('user_id', ids)
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (logsError) throw logsError;
      if (logs.length === 0) return [];
      const [profiles, kudos] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', [...new Set(logs.map((log) => log.user_id))]),
        supabase
          .from('kudos')
          .select('run_log_id, user_id')
          .in(
            'run_log_id',
            logs.map((log) => log.id),
          ),
      ]);
      if (profiles.error) throw profiles.error;
      if (kudos.error) throw kudos.error;
      const profileById = new Map(profiles.data.map((profile) => [profile.id, profile]));
      const kudosByLog = new Map<string, { count: number; byMe: boolean }>();
      for (const kudo of kudos.data) {
        const entry = kudosByLog.get(kudo.run_log_id) ?? { count: 0, byMe: false };
        entry.count += 1;
        if (kudo.user_id === userId) entry.byMe = true;
        kudosByLog.set(kudo.run_log_id, entry);
      }
      return logs.map((log) => ({
        id: log.id,
        userId: log.user_id,
        logDate: log.log_date,
        distanceKm: log.distance_km,
        durationSec: log.duration_sec,
        paceSecPerKm: log.avg_pace_sec_per_km,
        displayName: profileById.get(log.user_id)?.display_name ?? null,
        avatarUrl: profileById.get(log.user_id)?.avatar_url ?? null,
        kudosCount: kudosByLog.get(log.id)?.count ?? 0,
        kudosByMe: kudosByLog.get(log.id)?.byMe ?? false,
      }));
    },
  });
}

export function useKudos() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async ({ runLogId, liked }: { runLogId: string; liked: boolean }) => {
      if (!userId) throw new Error('not-authenticated');
      if (liked) {
        const { error } = await supabase.from('kudos').delete().eq('run_log_id', runLogId).eq('user_id', userId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from('kudos').insert({ run_log_id: runLogId, user_id: userId });
      if (error && error.code !== '23505') throw error;
    },
    onMutate: async ({ runLogId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ['friends-feed'] });
      const snapshots = queryClient.getQueriesData<FeedItem[]>({ queryKey: ['friends-feed'] });
      queryClient.setQueriesData<FeedItem[]>({ queryKey: ['friends-feed'] }, (items) =>
        items?.map((item) =>
          item.id === runLogId
            ? { ...item, kudosByMe: !liked, kudosCount: Math.max(0, item.kudosCount + (liked ? -1 : 1)) }
            : item,
        ),
      );
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      for (const [key, data] of context.snapshots) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['friends-feed'] }),
  });
}
