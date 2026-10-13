import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppCard } from '@/components/ui/AppCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import licenses from '@/features/legal/licenses.json';

const OPEN_METEO_URL = 'https://open-meteo.com';

export function LicensesPage() {
  const { t } = useTranslation('licenses');

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-5 px-4 py-6">
      <div className="space-y-2">
        <p className="section-label">{t('label')}</p>
        <h1 className="text-2xl font-semibold tracking-display">{t('title')}</h1>
        <p className="text-sm text-text-secondary">{t('intro')}</p>
      </div>

      <AppCard className="space-y-2">
        <SectionHeader label={t('sources.title')} />
        <p className="text-sm text-text-secondary">
          {t('sources.attribution')}{' '}
          <a
            href={OPEN_METEO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-ink hover:text-primary-ink-hover"
          >
            Open-Meteo.com
          </a>
          {`, ${t('sources.license')}`}
        </p>
      </AppCard>

      <AppCard className="space-y-2">
        <SectionHeader label={t('libraries.title')} />
        <ul data-testid="license-list" className="divide-y divide-border">
          {licenses.map((entry) => (
            <li
              key={`${entry.name}@${entry.version}`}
              data-testid="license-row"
              className="flex items-center gap-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={entry.url ?? `https://www.npmjs.com/package/${entry.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium hover:text-primary-ink"
                >
                  {entry.name}
                </a>
                <p className="num text-caption text-text-muted">v{entry.version}</p>
              </div>
              <AppBadge tone={entry.license === 'UNKNOWN' ? 'warning' : 'neutral'}>{entry.license}</AppBadge>
            </li>
          ))}
        </ul>
      </AppCard>
    </div>
  );
}
