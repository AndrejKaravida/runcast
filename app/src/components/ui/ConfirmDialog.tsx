import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppModal } from '@/components/ui/AppModal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  error?: string;
  confirmText?: string;
  confirmHint?: string;
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
  confirmText,
  confirmHint,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');

  const confirmDisabled = confirmText !== undefined && typed !== confirmText;

  function close() {
    setTyped('');
    onClose();
  }

  return (
    <AppModal open={open} onClose={close} title={title}>
      <p className="text-sm text-text-secondary">{description}</p>
      {confirmText !== undefined ? (
        <div className="mt-3">
          <AppInput
            label={confirmText}
            hint={confirmHint}
            value={typed}
            autoComplete="off"
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-danger-ink">{error}</p> : null}
      <div className="mt-4 flex gap-3">
        <AppButton variant="secondary" className="flex-1" onClick={close}>
          {t('actions.cancel')}
        </AppButton>
        <AppButton
          variant={tone === 'danger' ? 'danger' : 'primary'}
          className="flex-1"
          loading={loading}
          disabled={confirmDisabled}
          onClick={onConfirm}
        >
          {confirmLabel}
        </AppButton>
      </div>
    </AppModal>
  );
}
