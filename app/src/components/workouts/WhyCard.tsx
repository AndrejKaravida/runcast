import type { WorkoutExplanation } from '@runcast/shared';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppCard } from '@/components/ui/AppCard';

interface WhyCardProps {
  explanation: WorkoutExplanation;
}

export function WhyCard({ explanation }: WhyCardProps) {
  const { t } = useTranslation('workout');
  const { why, how, mistake, effortLabel, effortCue } = explanation;
  const whySuffix = why.suffix ? ` ${t(why.suffix.key, why.suffix.params)}` : '';
  const effortSuffix = effortCue.suffix ? ` ${t(effortCue.suffix.key, effortCue.suffix.params)}` : '';

  return (
    <AppCard data-testid="why-card" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t('why.title')}</p>
        <AppBadge tone="primary" className="shrink-0">
          {t(effortLabel.key, effortLabel.params)}
        </AppBadge>
      </div>
      <p className="text-sm text-text-secondary">
        {t(why.key, why.params)}
        {whySuffix}
      </p>
      <ul className="divide-y divide-border">
        {how.map((item, index) => (
          <li key={`${item.key}-${index}`} className="py-2 text-sm">
            {t(item.key, item.params)}
            {item.suffix ? ` ${t(item.suffix.key, item.suffix.params)}` : ''}
          </li>
        ))}
      </ul>
      <p className="text-xs text-text-muted">
        {t(effortCue.key, effortCue.params)}
        {effortSuffix}
      </p>
      <div className="rounded-xl bg-warning-soft p-3 text-xs text-warning-ink">
        <p className="font-semibold">{t('why.mistake')}</p>
        <p className="mt-0.5">{t(mistake.key, mistake.params)}</p>
      </div>
    </AppCard>
  );
}
