import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';
import { useProfile } from '@/features/profile/queries';

export function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RedirectIfAuthed() {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/today" replace />;
  return <Outlet />;
}

export function RequireOnboarding() {
  const { data: profile, isLoading } = useProfile();
  if (isLoading) return <FullScreenLoader />;
  if (!profile?.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
