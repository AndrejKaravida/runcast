import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { AppModal } from '@/components/ui/AppModal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  loading = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <AppModal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-text-secondary">{description}</p>
      {error ? <p className="mt-2 text-sm text-danger-ink">{error}</p> : null}
      <div className="mt-4 flex gap-3">
        <AppButton variant="secondary" className="flex-1" onClick={onClose}>
          {t('actions.cancel')}
        </AppButton>
        <AppButton
          variant={tone === 'danger' ? 'danger' : 'primary'}
          className="flex-1"
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </AppButton>
      </div>
    </AppModal>
  );
}
