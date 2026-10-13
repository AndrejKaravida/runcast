import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types';

export type LeaderboardEntry = Database['public']['Functions']['weekly_leaderboard']['Returns'][number];

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
