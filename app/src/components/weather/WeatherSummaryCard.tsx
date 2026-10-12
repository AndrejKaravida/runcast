import { RefreshCw } from 'lucide-react';
import { AppCard } from '@/components/ui/AppCard';
import type { WeatherData } from '@/features/weather/queries';
import { weatherIcon } from '@/components/weather/weather-utils';

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
}: WeatherSummaryCardProps) {
  const hours = (data?.hours ?? []).filter((hour) => {
    const hourNumber = Number(hour.time.slice(11, 13));
    return hour.time.startsWith(date) && hourNumber >= windowStartHour && hourNumber < windowEndHour;
  });

  return (
    <AppCard>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Vreme za {dayLabel ? `${dayLabel} ` : ''}termin {String(windowStartHour).padStart(2, '0')}–
          {String(windowEndHour).padStart(2, '0')} h
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="-m-2 p-2 text-text-muted transition-transform hover:text-text active:scale-90"
          aria-label="Osveži prognozu"
        >
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        </button>
      </div>
      {isError ? (
        <p className="mt-2 text-sm text-danger">Prognoza trenutno nije dostupna. Pokušaj osvežavanje.</p>
      ) : hours.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">
          {loading ? 'Učitavam prognozu…' : 'Nema podataka za tvoj termin.'}
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {hours.map((hour) => {
            const Icon = weatherIcon(hour.weatherCode);
            return (
              <div
                key={hour.time}
                className="flex flex-col items-center gap-1 rounded-xl bg-surface-elevated px-2 py-2.5"
              >
                <span className="text-[11px] text-text-muted">{hour.time.slice(11, 16)}</span>
                <Icon className="h-5 w-5 text-text-secondary" aria-hidden />
                <span className="text-sm font-semibold">{Math.round(hour.apparentC)}°</span>
                <span className="text-[11px] text-rain">{Math.round(hour.precipProbabilityPct)}%</span>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-[11px] text-text-muted">
        {updatedAt
          ? `Ažurirano: ${new Date(updatedAt).toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' })}`
          : ''}
        {' · Vreme: Open-Meteo'}
      </p>
    </AppCard>
  );
}
