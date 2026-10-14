import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { AppButton } from '@/components/ui/AppButton';

const CHUNK_ERROR_FRAGMENTS = [
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'error loading dynamically imported module',
  'failed to load module script',
];

function isChunkLoadError(error: unknown): boolean {
  const messages: string[] = [];
  if (error instanceof Error) messages.push(error.message);
  if (typeof error === 'string') messages.push(error);
  if (isRouteErrorResponse(error)) {
    messages.push(error.statusText ?? '', typeof error.data === 'string' ? error.data : '');
  }
  return messages.some((message) => CHUNK_ERROR_FRAGMENTS.some((fragment) => message.toLowerCase().includes(fragment)));
}

export function ErrorScreen() {
  const { t } = useTranslation('common');
  const error = useRouteError();
  const chunkError = isChunkLoadError(error);

  return (
    <div
      data-testid="error-screen"
      role="alert"
      className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col items-center justify-center gap-3 px-4 text-center"
    >
      <p className="text-lg font-semibold">{t('errorScreen.title')}</p>
      <p className="text-sm text-text-secondary">{t(chunkError ? 'errorScreen.chunk' : 'errorScreen.message')}</p>
      <div className="mt-1 flex items-center gap-4">
        <AppButton size="sm" onClick={() => window.location.reload()}>
          {t('actions.retry')}
        </AppButton>
        <Link className="text-sm font-medium text-primary-ink hover:text-primary-ink-hover" to="/today">
          {t('errorScreen.home')}
        </Link>
      </div>
    </div>
  );
}
