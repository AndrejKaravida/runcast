import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryError({
  message = 'Veza je trenutno slaba. Proveri internet i pokušaj ponovo.',
  onRetry,
}: QueryErrorProps) {
  return (
    <EmptyState
      title="Ne mogu da učitam podatke"
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
