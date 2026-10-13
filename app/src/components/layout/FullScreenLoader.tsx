import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function FullScreenLoader() {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center bg-bg">
      <Loader2 className="h-8 w-8 animate-spin text-primary-ink" aria-hidden />
      <span className="sr-only">{t('loading')}</span>
    </div>
  );
}
