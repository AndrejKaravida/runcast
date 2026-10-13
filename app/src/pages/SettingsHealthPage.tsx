import { useTranslation } from 'react-i18next';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import { HealthIntegrations } from '@/components/settings/HealthIntegrations';

export function SettingsHealthPage() {
  const { t } = useTranslation('settings');

  return (
    <SettingsSubpage title={t('integrations.label')}>
      <HealthIntegrations />
    </SettingsSubpage>
  );
}
