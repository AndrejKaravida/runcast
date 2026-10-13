import { downloadBlob } from '@/lib/download';
import { supabase } from '@/lib/supabase';
import type {
  Database,
  PlansRow,
  ProfilesRow,
  PushSubscriptionsRow,
  RacesRow,
  RunLogsRow,
  ShoesRow,
  WorkoutsRow,
} from '@/types';

type FriendshipsRow = Database['public']['Tables']['friendships']['Row'];
type BlocksRow = Database['public']['Tables']['blocks']['Row'];
type KudosRow = Database['public']['Tables']['kudos']['Row'];

export interface AccountExport {
  exported_at: string;
  app: 'RunCast';
  version: 1;
  profile: ProfilesRow | null;
  races: RacesRow[];
  plans: PlansRow[];
  workouts: WorkoutsRow[];
  run_logs: RunLogsRow[];
  shoes: ShoesRow[];
  push_subscriptions: PushSubscriptionsRow[];
  friendships: FriendshipsRow[];
  blocks: BlocksRow[];
  kudos: KudosRow[];
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('not-authenticated');
  return data.user.id;
}

export async function exportAccountData(): Promise<AccountExport> {
  const userId = await currentUserId();

  const [profile, races, plans, workouts, runLogs, shoes, pushSubscriptions, friendships, blocks, kudos] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('races').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('plans').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('workouts').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('run_logs').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('shoes').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('push_subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order('created_at', { ascending: true }),
      supabase.from('blocks').select('*').eq('blocker_id', userId).order('created_at', { ascending: true }),
      supabase.from('kudos').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    ]);

  if (profile.error) throw profile.error;
  if (races.error) throw races.error;
  if (plans.error) throw plans.error;
  if (workouts.error) throw workouts.error;
  if (runLogs.error) throw runLogs.error;
  if (shoes.error) throw shoes.error;
  if (pushSubscriptions.error) throw pushSubscriptions.error;
  if (friendships.error) throw friendships.error;
  if (blocks.error) throw blocks.error;
  if (kudos.error) throw kudos.error;

  return {
    exported_at: new Date().toISOString(),
    app: 'RunCast',
    version: 1,
    profile: profile.data,
    races: races.data ?? [],
    plans: plans.data ?? [],
    workouts: workouts.data ?? [],
    run_logs: runLogs.data ?? [],
    shoes: shoes.data ?? [],
    push_subscriptions: pushSubscriptions.data ?? [],
    friendships: friendships.data ?? [],
    blocks: blocks.data ?? [],
    kudos: kudos.data ?? [],
  };
}

export async function downloadAccountData(): Promise<void> {
  const payload = await exportAccountData();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob('runcast-podaci.json', blob);
}
