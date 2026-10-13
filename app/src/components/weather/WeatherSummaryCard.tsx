import { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppCard } from '@/components/ui/AppCard';
import { IconButton } from '@/components/ui/IconButton';
import type { WeatherData } from '@/features/weather/queries';
import { weatherIcon } from '@/components/weather/weather-utils';
import { localeForLanguage } from '@/i18n';

interface WeatherSummaryCardProps {
  data: WeatherData | undefined;
  isError: boolean;
  date: string;
  dayLabel?: string;
  windowStartHour: number;
  windowEndHour: number;
  updatedAt: number | null;
  loading: boolean;
  onRefresh: () => void;
  variant?: 'card' | 'row';
}

function rowIcon(code: number | undefined) {
  if (code === undefined) return <RefreshCw className="h-5 w-5 shrink-0 text-text-muted" aria-hidden />;
  const Icon = weatherIcon(code);
  return <Icon className="h-5 w-5 shrink-0 text-text-secondary" aria-hidden />;
}

function hourTiles(hours: WeatherData['hours']) {
  return hours.map((hour) => {
    const Icon = weatherIcon(hour.weatherCode);
    return (
      <div key={hour.time} className="flex flex-col items-center gap-1 rounded-xl bg-surface-elevated px-2 py-2.5">
        <span className="num text-caption text-text-muted">{hour.time.slice(11, 16)}</span>
        <Icon className="h-5 w-5 text-text-secondary" aria-hidden />
        <span className="num text-sm font-semibold">{Math.round(hour.apparentC)}°</span>
        <span className="num text-caption text-rain-ink">{Math.round(hour.precipProbabilityPct)}%</span>
      </div>
    );
  });
}

export function WeatherSummaryCard({
  data,
  isError,
  date,
  dayLabel,
  windowStartHour,
  windowEndHour,
  updatedAt,
  loading,
  onRefresh,
  variant = 'card',
}: WeatherSummaryCardProps) {
  const { t, i18n } = useTranslation('workout');
  const [expanded, setExpanded] = useState(false);
  const hours = (data?.hours ?? []).filter((hour) => {
    const hourNumber = Number(hour.time.slice(11, 13));
    return hour.time.startsWith(date) && hourNumber >= windowStartHour && hourNumber < windowEndHour;
  });
  const from = String(windowStartHour).padStart(2, '0');
  const to = String(windowEndHour).padStart(2, '0');
  const title = dayLabel ? t('weather.titleDay', { day: dayLabel, from, to }) : t('weather.title', { from, to });
  const updatedText = updatedAt
    ? t('weather.updated', {
        time: new Date(updatedAt).toLocaleTimeString(localeForLanguage(i18n.language), {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    : '';

  if (variant === 'row') {
    const first = hours[0];
    const summary = isError
      ? t('weather.error')
      : first
        ? t('weather.inWindow', {
            temp: Math.round(first.apparentC),
            rain: Math.round(first.precipProbabilityPct),
            time: first.time.slice(11, 16),
          })
        : loading
          ? t('weather.loading')
          : t('weather.none');
    return (
      <div className="rounded-2xl border border-border bg-surface shadow-card">
        <div className="flex items-center gap-1 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99]"
          >
            {rowIcon(first?.weatherCode)}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{title}</span>
              <span
                className={clsx('block truncate text-caption', isError ? 'text-danger-ink' : 'num text-text-muted')}
              >
                {summary}
              </span>
            </span>
            <ChevronDown
              className={clsx('h-4 w-4 shrink-0 text-text-muted transition-transform', expanded && 'rotate-180')}
              aria-hidden
            />
          </button>
          <IconButton
            label={t('weather.refresh')}
            onClick={onRefresh}
            className="h-9 w-9 shrink-0 rounded-xl text-text-muted hover:text-text"
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
          </IconButton>
        </div>
        {expanded ? (
          <div className="border-t border-border px-4 pb-3 pt-3">
            {hours.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">{hourTiles(hours)}</div>
            ) : (
              <p className="text-sm text-text-muted">{isError ? t('weather.error') : t('weather.none')}</p>
            )}
            <p className="mt-2 text-caption text-text-muted">
              {updatedText}
              {updatedText ? ' · ' : ''}
              {t('weather.source')}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <AppCard>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <IconButton
          label={t('weather.refresh')}
          onClick={onRefresh}
          className="-m-2 h-8 w-8 text-text-muted hover:text-text"
        >
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
        </IconButton>
      </div>
      {isError ? (
        <p className="mt-2 text-sm text-danger-ink">{t('weather.error')}</p>
      ) : hours.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">{loading ? t('weather.loading') : t('weather.none')}</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">{hourTiles(hours)}</div>
      )}
      <p className="num mt-2 text-caption text-text-muted">
        {updatedText}
        {updatedText ? ' · ' : ''}
        {t('weather.source')}
      </p>
    </AppCard>
  );
}
