import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryError({
  message = 'Podaci trenutno ne mogu da se učitaju. Proveri vezu i pokušaj ponovo.',
  onRetry,
}: QueryErrorProps) {
  return (
    <EmptyState
      title="Greška pri učitavanju"
      description={message}
      action={
        onRetry ? (
          <AppButton size="sm" variant="secondary" onClick={onRetry}>
            Pokušaj ponovo
          </AppButton>
        ) : undefined
      }
    />
  );
}
