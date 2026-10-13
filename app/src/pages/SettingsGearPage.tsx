import { useTranslation } from 'react-i18next';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import { GearSection } from '@/components/settings/GearSection';

export function SettingsGearPage() {
  const { t } = useTranslation('settings');

  return (
    <SettingsSubpage title={t('gear.label')}>
      <GearSection />
    </SettingsSubpage>
  );
}
