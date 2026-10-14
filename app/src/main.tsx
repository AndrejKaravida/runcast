import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { RouterProvider } from 'react-router';
import { AuthProvider } from '@/auth/AuthProvider';
import { AppSplash } from '@/components/layout/AppSplash';
import { PwaUpdatePrompt } from '@/components/layout/PwaUpdatePrompt';
import i18n from '@/i18n';
import { installErrorReporting } from '@/lib/error-reporting';
import { initNativeShell } from '@/lib/native';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/router';
import { ThemeProvider } from '@/theme/ThemeProvider';
import './styles/theme.css';

installErrorReporting();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <AppSplash />
            <PwaUpdatePrompt />
          </AuthProvider>
        </ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  </StrictMode>,
);

void initNativeShell();
