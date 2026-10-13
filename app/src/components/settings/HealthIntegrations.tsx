import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { getHealthSource, WebStubSource } from '@/features/health/adapter';
import { useHealthIntegration, useImportHealthRuns } from '@/features/health/queries';
import { localeForLanguage } from '@/i18n';
import { openExternal } from '@/lib/native';

const HEALTH_CONNECT_STORE_URL = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

function formatSyncTime(iso: string, language: string): string {
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function HealthIntegrations() {
  const { t, i18n } = useTranslation('settings');
  const source = getHealthSource();
  const { available, autosync, lastSync, updateAutosync, refreshLastSync } = useHealthIntegration();
  const importRuns = useImportHealthRuns();
  const [connected, setConnected] = useState(() => lastSync !== null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (source instanceof WebStubSource) {
    return (
      <AppCard>
        <p data-testid="health-web" className="text-sm font-medium">
          {t('integrations.webUnavailable')}
        </p>
        <p className="mt-1 text-caption text-text-muted">{t('integrations.webHint')}</p>
      </AppCard>
    );
  }

  const android = Capacitor.getPlatform() === 'android';
  const provider = t(android ? 'integrations.healthConnect' : 'integrations.appleHealth');
  const lastSyncText = lastSync
    ? t('integrations.lastSync', {
        date: formatSyncTime(lastSync.at, i18n.resolvedLanguage ?? i18n.language),
        imported: lastSync.imported,
        skipped: lastSync.skipped,
      })
    : t('integrations.noSync');

  async function handleConnect() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const granted = await source.requestPermissions();
      if (!granted) {
        setError(t('integrations.permissionDenied'));
        return;
      }
      setConnected(true);
      setNotice(t('integrations.connected'));
    } catch {
      setError(t('integrations.importFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (importRuns.isPending) return;
    setError(null);
    setNotice(null);
    try {
      if (!connected) {
        const granted = await source.requestPermissions();
        if (!granted) {
          setError(t('integrations.permissionDenied'));
          return;
        }
        setConnected(true);
      }
      const result = await importRuns.mutateAsync();
      refreshLastSync();
      if (result.imported > 0) {
        setNotice(
          t('integrations.importedNotice', {
            imported: result.imported,
            skipped: result.skipped,
            linked: result.linked,
          }),
        );
      } else if (result.fetched === 0) {
        setError(t('integrations.noneOrDenied'));
      } else {
        setNotice(t('integrations.noneNew'));
      }
    } catch {
      setError(t('integrations.importFailed'));
    }
  }

  return (
    <AppCard className="space-y-4">
      <div data-testid="health-status" className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{provider}</p>
        {available === null ? null : (
          <AppBadge tone={available !== 'available' ? 'warning' : connected ? 'success' : 'neutral'}>
            {available !== 'available'
              ? t('integrations.statusUnavailable')
              : connected
                ? t('integrations.statusConnected')
                : t('integrations.statusDisconnected')}
          </AppBadge>
        )}
      </div>
      <p className="text-caption text-text-muted">{t('integrations.subtitle')}</p>
      <p className="text-caption text-text-muted">
        {t('integrations.consent')}{' '}
        <Link to="/privacy" className="underline hover:text-text">
          {t('integrations.consentLink')}
        </Link>
      </p>

      {available === 'needs-install' ? (
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">{t('integrations.needsInstall')}</p>
          <p className="text-caption text-text-muted">{t('integrations.needsInstallHint')}</p>
          <AppButton
            variant="secondary"
            className="w-full"
            data-testid="health-install"
            onClick={() => void openExternal(HEALTH_CONNECT_STORE_URL)}
          >
            {t('integrations.install')}
          </AppButton>
        </div>
      ) : (
        <div className="flex gap-3">
          {connected ? null : (
            <AppButton
              variant="secondary"
              className="flex-1"
              data-testid="health-connect"
              loading={busy}
              onClick={() => void handleConnect()}
            >
              {t('integrations.connect', { provider })}
            </AppButton>
          )}
          <AppButton
            className="flex-1"
            data-testid="health-import"
            loading={importRuns.isPending}
            onClick={() => void handleImport()}
          >
            {t('integrations.import')}
          </AppButton>
        </div>
      )}

      <div>
        <p className="section-label mb-1.5">{t('integrations.autosync')}</p>
        <SegmentedControl
          value={autosync ? 'on' : 'off'}
          onChange={(value) => updateAutosync(value === 'on')}
          options={[
            { value: 'on', label: t('integrations.autosyncOn') },
            { value: 'off', label: t('integrations.autosyncOff') },
          ]}
        />
        <p className="mt-2 text-caption text-text-muted">{t('integrations.autosyncHint')}</p>
      </div>

      <p data-testid="health-last-sync" className="text-caption text-text-muted">
        {lastSyncText}
      </p>

      {available === 'available' ? (
        <p data-testid="health-xiaomi" className="text-caption text-text-muted">
          {t(android ? 'integrations.xiaomiAndroid' : 'integrations.xiaomiIos')}
        </p>
      ) : null}

      <p className="text-caption text-text-muted">{t('integrations.privacy')}</p>

      {notice ? (
        <p data-testid="health-notice" className="text-sm text-success-ink">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p data-testid="health-error" className="text-sm text-danger-ink">
          {error}
        </p>
      ) : null}
    </AppCard>
  );
}
