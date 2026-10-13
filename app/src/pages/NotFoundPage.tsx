import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function NotFoundPage() {
  const { t } = useTranslation('common');
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-3xl font-bold">404</p>
      <p className="text-sm text-text-secondary">{t('notFound.text')}</p>
      <Link className="text-sm font-medium text-primary-ink hover:text-primary-ink-hover" to="/today">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
