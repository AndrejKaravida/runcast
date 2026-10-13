import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { HealthIntegrations } from '@/components/settings/HealthIntegrations';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import { AppCard } from '@/components/ui/AppCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { getHealthSource, WebStubSource } from '@/features/health/adapter';
import { readReadinessAutosync, writeReadinessAutosync } from '@/features/health/queries';

export function SettingsHealthPage() {
  const { t } = useTranslation('settings');
  const [autosync, setAutosync] = useState(readReadinessAutosync);

  function handleAutosync(value: boolean) {
    writeReadinessAutosync(value);
    setAutosync(value);
    const source = getHealthSource();
    if (value && !(source instanceof WebStubSource)) void source.requestReadinessPermissions();
  }

  return (
    <SettingsSubpage title={t('integrations.label')}>
      <HealthIntegrations />
      <AppCard className="space-y-3">
        <div>
          <p className="section-label mb-1.5">{t('integrations.readinessToggle')}</p>
          <div data-testid="readiness-autosync">
            <SegmentedControl
              value={autosync ? 'on' : 'off'}
              onChange={(value) => handleAutosync(value === 'on')}
              options={[
                { value: 'on', label: t('integrations.autosyncOn') },
                { value: 'off', label: t('integrations.autosyncOff') },
              ]}
            />
          </div>
        </div>
        <p className="text-caption text-text-muted">
          {t('integrations.readinessHint')}{' '}
          <Link to="/privacy" className="underline hover:text-text">
            {t('integrations.consentLink')}
          </Link>
        </p>
      </AppCard>
    </SettingsSubpage>
  );
}
