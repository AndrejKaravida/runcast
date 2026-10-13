import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryError({ message, onRetry }: QueryErrorProps) {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t('queryError.title')}
      description={message ?? t('queryError.message')}
      action={
        onRetry ? (
          <AppButton size="sm" variant="secondary" onClick={onRetry}>
            {t('actions.retry')}
          </AppButton>
        ) : undefined
      }
    />
  );
}
