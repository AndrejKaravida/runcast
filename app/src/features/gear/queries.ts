import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { useRunLogs } from '@/features/logs/queries';
import { supabase } from '@/lib/supabase';
import type { RunLogsRow, ShoesRow, ShoesUpdate } from '@/types';

export interface ShoeWithKm extends ShoesRow {
  totalKm: number;
}

export function shoesWithTotals(shoes: ShoesRow[], logs: RunLogsRow[]): ShoeWithKm[] {
  const distanceByShoe = new Map<string, number>();
  for (const log of logs) {
    if (!log.shoe_id || !log.distance_km) continue;
    distanceByShoe.set(log.shoe_id, (distanceByShoe.get(log.shoe_id) ?? 0) + log.distance_km);
  }
  return shoes.map((shoe) => ({
    ...shoe,
    totalKm: Math.round((shoe.initial_km + (distanceByShoe.get(shoe.id) ?? 0)) * 10) / 10,
  }));
}

export function useShoes() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: logs } = useRunLogs();
  const query = useQuery({
    queryKey: ['shoes', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ShoesRow[]> => {
      const { data, error } = await supabase
        .from('shoes')
        .select('*')
        .eq('user_id', userId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const shoes = useMemo(() => shoesWithTotals(query.data ?? [], logs ?? []), [query.data, logs]);
  return { ...query, data: shoes };
}

export interface AddShoeInput {
  name: string;
  initialKm: number;
}

export function useAddShoe() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async (input: AddShoeInput) => {
      const { error } = await supabase.from('shoes').insert({
        user_id: userId as string,
        name: input.name,
        initial_km: input.initialKm,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shoes'] }),
  });
}

export function useUpdateShoe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & ShoesUpdate) => {
      const { data, error } = await supabase.from('shoes').update(values).eq('id', id).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('Shoe not updated');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shoes'] }),
  });
}

export function useDeleteShoe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('shoes').delete().eq('id', id).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('Shoe not deleted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoes'] });
      queryClient.invalidateQueries({ queryKey: ['run-logs'] });
    },
  });
}
