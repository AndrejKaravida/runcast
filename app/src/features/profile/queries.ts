import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { resizeAvatar } from '@/features/profile/avatar';
import { supabase } from '@/lib/supabase';
import type { ProfilesRow, ProfilesUpdate } from '@/types';

export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ProfilesRow> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async (values: ProfilesUpdate): Promise<ProfilesRow> => {
      const { data, error } = await supabase
        .from('profiles')
        .update(values)
        .eq('id', userId as string)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', userId], data);
      queryClient.invalidateQueries({ queryKey: ['weather'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useUploadAvatar() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async (file: File): Promise<ProfilesRow> => {
      const blob = await resizeAvatar(file);
      const path = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, {
        upsert: true,
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: `${publicUrl.publicUrl}?v=${Date.now()}` })
        .eq('id', userId as string)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', userId], data);
    },
  });
}
