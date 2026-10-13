import { bestWindow, runWindowHours, type RunWindow } from '@runcast/shared';
import { useTranslation } from 'react-i18next';
import { AppCard } from '@/components/ui/AppCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { weatherIcon } from '@/components/weather/weather-utils';
import type { WeatherData } from '@/features/weather/queries';

const STRIP_HOURS = 4;
const OPEN_METEO_URL = 'https://open-meteo.com';
const SKELETON_TILES = Array.from({ length: STRIP_HOURS }, (_, index) => index);

function hourNumber(time: string): number {
  return Number(time.slice(11, 13));
}

function forecastIcon(code: number, className: string) {
  const Icon = weatherIcon(code);
  return <Icon className={className} aria-hidden />;
}

function WeatherHeroSkeleton() {
  return (
    <AppCard data-testid="weather-hero-skeleton" className="space-y-2.5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-7 shrink-0" />
        <Skeleton className="h-8 w-14 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {SKELETON_TILES.map((tile) => (
          <Skeleton key={tile} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-4 w-40" />
    </AppCard>
  );
}

interface WeatherHeroProps {
  data: WeatherData | undefined;
  isError: boolean;
  isLoading: boolean;
  date: string;
  runWindow: RunWindow;
}

export function WeatherHero({ data, isError, isLoading, date, runWindow }: WeatherHeroProps) {
  const { t } = useTranslation('today');
  if (isError) return null;
  if (!data) return isLoading ? <WeatherHeroSkeleton /> : null;

  const hours = data.hours.filter((hour) => hour.time.startsWith(date));
  if (hours.length === 0) return null;

  const nowHour = new Date().getHours();
  const current =
    hours.find((hour) => hourNumber(hour.time) === nowHour) ??
    hours.find((hour) => hourNumber(hour.time) >= nowHour) ??
    hours[hours.length - 1];
  const strip = hours.filter((hour) => hourNumber(hour.time) >= hourNumber(current.time)).slice(0, STRIP_HOURS);
  const window = runWindowHours(runWindow);
  const overall = bestWindow(data.hours, data.air, date);
  if (!overall) return null;

  const inWindow = bestWindow(data.hours, data.air, date, window.startHour, window.endHour);
  const earlier = overall.endHour <= window.startHour && (!inWindow || overall.score > inWindow.score);
  const suggestion = inWindow && inWindow.score >= overall.score ? inWindow : overall;

  return (
    <AppCard data-testid="weather-hero" className="space-y-2.5">
      <div className="flex items-center gap-3">
        {forecastIcon(current.weatherCode, 'h-7 w-7 shrink-0 text-text-secondary')}
        <p className="num shrink-0 text-2xl font-semibold tracking-display">{Math.round(current.apparentC)}°</p>
        <div className="min-w-0 flex-1">
          <p data-testid="weather-hero-window" className="text-sm font-medium">
            {earlier
              ? t('weather.earlier', { hour: overall.endHour })
              : t('weather.best', {
                  from: suggestion.startHour,
                  to: suggestion.endHour,
                  score: suggestion.score,
                })}
          </p>
          <p data-testid="weather-hero-conditions" className="num text-caption text-text-muted">
            {t('weather.conditions', {
              pct: Math.round(current.precipProbabilityPct),
              wind: Math.round(current.windKmh),
            })}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {strip.map((hour) => (
          <div
            key={hour.time}
            className="flex min-w-0 flex-col items-center gap-0.5 rounded-lg bg-surface-elevated px-1 py-1.5"
          >
            <span className="num text-caption text-text-muted">{hour.time.slice(11, 16)}</span>
            {forecastIcon(hour.weatherCode, 'h-4 w-4 text-text-secondary')}
            <span className="num text-caption font-semibold">{Math.round(hour.apparentC)}°</span>
            <span className="num text-caption text-rain-ink">{Math.round(hour.precipProbabilityPct)}%</span>
          </div>
        ))}
      </div>
      <p data-testid="weather-attribution" className="text-caption text-text-muted">
        {t('weather.attribution')}{' '}
        <a
          href={OPEN_METEO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-text-secondary hover:text-text"
        >
          Open-Meteo
        </a>
      </p>
    </AppCard>
  );
}
