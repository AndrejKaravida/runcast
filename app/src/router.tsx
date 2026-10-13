import { createBrowserRouter, Navigate } from 'react-router';
import { RedirectIfAuthed, RequireAuth, RequireOnboarding } from '@/auth/guards';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { TabLayout } from '@/components/layout/TabLayout';

export const router = createBrowserRouter([
  {
    element: <ScrollToTop />,
    children: [
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
        path: '/licenses',
        lazy: async () => ({ Component: (await import('@/pages/LicensesPage')).LicensesPage }),
      },
      {
        path: '/privacy',
        lazy: async () => ({ Component: (await import('@/pages/PrivacyPage')).PrivacyPage }),
      },
      {
        path: '/terms',
        lazy: async () => ({ Component: (await import('@/pages/TermsPage')).TermsPage }),
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
                  {
                    path: '/settings/profile',
                    lazy: async () => ({
                      Component: (await import('@/pages/SettingsProfilePage')).SettingsProfilePage,
                    }),
                  },
                  {
                    path: '/settings/plan',
                    lazy: async () => ({ Component: (await import('@/pages/SettingsPlanPage')).SettingsPlanPage }),
                  },
                  {
                    path: '/settings/notifications',
                    lazy: async () => ({
                      Component: (await import('@/pages/SettingsNotificationsPage')).SettingsNotificationsPage,
                    }),
                  },
                  {
                    path: '/settings/health',
                    lazy: async () => ({ Component: (await import('@/pages/SettingsHealthPage')).SettingsHealthPage }),
                  },
                  {
                    path: '/settings/gear',
                    lazy: async () => ({ Component: (await import('@/pages/SettingsGearPage')).SettingsGearPage }),
                  },
                  {
                    path: '/settings/account',
                    lazy: async () => ({
                      Component: (await import('@/pages/SettingsAccountPage')).SettingsAccountPage,
                    }),
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
              {
                path: '/race-day',
                lazy: async () => ({ Component: (await import('@/pages/RaceDayPage')).RaceDayPage }),
              },
              {
                path: '/benchmark',
                lazy: async () => ({ Component: (await import('@/pages/BenchmarkPage')).BenchmarkPage }),
              },
              {
                path: '/leaderboard',
                lazy: async () => ({ Component: (await import('@/pages/LeaderboardPage')).LeaderboardPage }),
              },
              {
                path: '/friends',
                lazy: async () => ({ Component: (await import('@/pages/FriendsPage')).FriendsPage }),
              },
            ],
          },
        ],
      },
      { path: '/', element: <Navigate to="/today" replace /> },
      { path: '*', lazy: async () => ({ Component: (await import('@/pages/NotFoundPage')).NotFoundPage }) },
    ],
  },
]);
