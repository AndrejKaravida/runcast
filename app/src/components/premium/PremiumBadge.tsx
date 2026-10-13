import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/ui/AppBadge';

export function PremiumBadge({ className }: { className?: string }) {
  const { t } = useTranslation('premium');

  return (
    <AppBadge tone="primary" className={className}>
      <Sparkles className="mr-1 h-3 w-3" aria-hidden /> {t('badge')}
    </AppBadge>
  );
}
