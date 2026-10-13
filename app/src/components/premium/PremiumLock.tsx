import { Lock } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppModal } from '@/components/ui/AppModal';
import { PREMIUM_FEATURES, type PremiumFeature } from '@/features/premium/registry';

interface PremiumLockProps {
  feature: PremiumFeature;
}

export function PremiumLock({ feature }: PremiumLockProps) {
  const { t } = useTranslation('premium');
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div data-testid="premium-lock" className="space-y-3 rounded-xl bg-surface-elevated p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink">
          <Lock className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-caption text-text-muted">{t('lockedTitle')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{t(PREMIUM_FEATURES[feature].labelKey)}</p>
            <PremiumBadge />
          </div>
          <p className="text-sm text-text-secondary">{t('lockedText')}</p>
        </div>
      </div>
      <AppButton variant="secondary" className="w-full" onClick={() => setDialogOpen(true)}>
        {t('dialogCta')}
      </AppButton>
      <AppModal open={dialogOpen} onClose={() => setDialogOpen(false)} title={t('dialogTitle')}>
        <p className="text-sm text-text-secondary">{t('dialogText')}</p>
        <AppButton className="mt-4 w-full" onClick={() => setDialogOpen(false)}>
          {t('common:actions.close')}
        </AppButton>
      </AppModal>
    </div>
  );
}
