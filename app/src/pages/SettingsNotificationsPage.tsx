import { useTranslation } from 'react-i18next';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import { PushNotifications } from '@/components/settings/PushNotifications';

export function SettingsNotificationsPage() {
  const { t } = useTranslation('settings');

  return (
    <SettingsSubpage title={t('push.label')}>
      <PushNotifications />
    </SettingsSubpage>
  );
}
