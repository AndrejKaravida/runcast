import { createBrowserRouter, Navigate } from 'react-router';
import { RedirectIfAuthed, RequireAuth, RequireOnboarding } from '@/auth/guards';
import { TabLayout } from '@/components/layout/TabLayout';

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuthed />,
    children: [
      { path: '/login', lazy: async () => ({ Component: (await import('@/pages/LoginPage')).LoginPage }) },
      { path: '/register', lazy: async () => ({ Component: (await import('@/pages/RegisterPage')).RegisterPage }) },
      {
        path: '/forgot-password',
        lazy: async () => ({ Component: (await import('@/pages/ForgotPasswordPage')).ForgotPasswordPage }),
      },
    ],
  },
  {
    path: '/reset-password',
    lazy: async () => ({ Component: (await import('@/pages/ResetPasswordPage')).ResetPasswordPage }),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/onboarding',
        lazy: async () => ({ Component: (await import('@/pages/OnboardingPage')).OnboardingPage }),
      },
      {
        element: <RequireOnboarding />,
        children: [
          {
            element: <TabLayout />,
            children: [
              { path: '/today', lazy: async () => ({ Component: (await import('@/pages/TodayPage')).TodayPage }) },
              { path: '/plan', lazy: async () => ({ Component: (await import('@/pages/PlanPage')).PlanPage }) },
              { path: '/stats', lazy: async () => ({ Component: (await import('@/pages/StatsPage')).StatsPage }) },
              {
                path: '/settings',
                lazy: async () => ({ Component: (await import('@/pages/SettingsPage')).SettingsPage }),
              },
            ],
          },
          {
            path: '/workout/:id',
            lazy: async () => ({ Component: (await import('@/pages/WorkoutPage')).WorkoutPage }),
          },
          {
            path: '/run/:id',
            lazy: async () => ({ Component: (await import('@/pages/GuidedRunPage')).GuidedRunPage }),
          },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/today" replace /> },
  { path: '*', lazy: async () => ({ Component: (await import('@/pages/NotFoundPage')).NotFoundPage }) },
]);
