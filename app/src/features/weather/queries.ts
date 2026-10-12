import { useQuery } from '@tanstack/react-query';
import { fetchAirQuality, fetchForecast, type HourlyForecast } from '@runcast/shared';
import { useProfile } from '@/features/profile/queries';

export interface WeatherData {
  hours: HourlyForecast[];
  air: { time: string; pm25: number }[];
}

export function useWeather() {
  const { data: profile } = useProfile();
  const lat = profile?.lat ?? null;
  const lon = profile?.lon ?? null;
  const refreshMinutes = profile ? profile.weather_refresh_minutes : 60;
  const manual = refreshMinutes === null;
  const interval = manual ? 0 : (refreshMinutes ?? 60) * 60_000;

  return useQuery<WeatherData>({
    queryKey: ['weather', lat, lon],
    enabled: lat !== null && lon !== null,
    queryFn: async () => {
      if (lat === null || lon === null) throw new Error('Location missing');
      const [hours, air] = await Promise.all([fetchForecast(lat, lon), fetchAirQuality(lat, lon)]);
      return { hours, air };
    },
    staleTime: manual ? Infinity : interval,
    refetchInterval: manual ? false : interval,
    refetchOnWindowFocus: !manual,
  });
}
