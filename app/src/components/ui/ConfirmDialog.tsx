import { AppButton } from '@/components/ui/AppButton';
import { AppModal } from '@/components/ui/AppModal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
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
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <AppModal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-text-secondary">{description}</p>
      <div className="mt-4 flex gap-3">
        <AppButton variant="secondary" className="flex-1" onClick={onClose}>
          Otkaži
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
