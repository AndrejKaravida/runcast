import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { PushSubscriptionsRow, PushSubscriptionsUpdate } from '@/types';

function pushQueryKey(userId: string | undefined) {
  return ['push', userId] as const;
}

export function usePushSubscription() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: pushQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<PushSubscriptionsRow | null> => {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId as string)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export async function fetchPushPublicKey(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_push_public_key');
  if (error) throw error;
  return data;
}

export interface SavePushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  language: string;
  timezone: string;
  remind_hour: number;
  remind_today: boolean;
  remind_training: boolean;
  remind_weather: boolean;
  remind_missed: boolean;
  remind_recap: boolean;
  remind_race_week: boolean;
}

export function useSavePushSubscription() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async (input: SavePushSubscriptionInput): Promise<PushSubscriptionsRow> => {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert({ ...input, user_id: userId as string }, { onConflict: 'endpoint' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(pushQueryKey(userId), data);
    },
  });
}

export function useUpdatePushPreferences() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & PushSubscriptionsUpdate): Promise<PushSubscriptionsRow> => {
      const { data, error } = await supabase.from('push_subscriptions').update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(pushQueryKey(userId), data);
    },
  });
}

export function useDeletePushSubscription() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async (endpoint: string | null): Promise<void> => {
      let request = supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId as string);
      if (endpoint) request = request.eq('endpoint', endpoint);
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(pushQueryKey(userId), null);
    },
  });
}

export function useSendTestPush() {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase.functions.invoke('send-reminders', { body: { test: true } });
      if (error) throw error;
    },
  });
}
