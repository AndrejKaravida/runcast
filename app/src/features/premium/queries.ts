import { useProfile } from '@/features/profile/queries';

export function usePremium() {
  const { data: profile } = useProfile();
  return {
    isPremium: profile?.premium === true,
    premiumSince: profile?.premium_since ?? null,
  };
}
