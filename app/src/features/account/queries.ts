import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

const AVATAR_BUCKET = 'avatars';
const LOCAL_STORAGE_PREFIX = 'runcast.';

function clearLocalStorage(): void {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key?.startsWith(LOCAL_STORAGE_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

export function useDeleteAccount() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!userId) throw new Error('not-authenticated');

      const { data: files, error: listError } = await supabase.storage.from(AVATAR_BUCKET).list(userId);
      if (listError) throw listError;
      if (files && files.length > 0) {
        const paths = files.map((file) => `${userId}/${file.name}`);
        const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove(paths);
        if (removeError) throw removeError;
      }

      const { error: rpcError } = await supabase.rpc('delete_my_account');
      if (rpcError) throw rpcError;

      await supabase.auth.signOut();
      clearLocalStorage();
    },
  });
}
