export interface HourlyForecast {
  time: string;
  temperatureC: number;
  apparentC: number;
  precipProbabilityPct: number;
  precipMm: number;
  weatherCode: number;
  windKmh: number;
  windGustKmh: number;
}

export interface Place {
  name: string;
  country: string;
  admin1: string | null;
  lat: number;
  lon: number;
}

interface HourlyRecord {
  time: string[];
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hourlyOf(json: unknown): HourlyRecord | null {
  if (!isRecord(json)) return null;
  const hourly = json.hourly;
  if (!isRecord(hourly) || !Array.isArray(hourly.time)) return null;
  if (!hourly.time.every((item) => typeof item === 'string')) return null;
  return hourly as unknown as HourlyRecord;
}

function numberSeries(hourly: HourlyRecord, key: string): number[] | null {
  const value = hourly[key];
  if (!Array.isArray(value) || value.length !== (hourly.time as string[]).length) return null;
  if (!value.every((item) => typeof item === 'number' || item === null)) return null;
  return value.map((item) => (typeof item === 'number' ? item : 0));
}

export function buildForecastUrl(lat: number, lon: number, forecastDays = 7): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly:
      'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
    timezone: 'auto',
    forecast_days: String(forecastDays),
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export function buildAirQualityUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'pm2_5',
    timezone: 'auto',
    forecast_days: '7',
  });
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`;
}

export function buildGeocodingUrl(query: string): string {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'sr',
    format: 'json',
  });
  return `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
}

export function parseForecast(json: unknown): HourlyForecast[] {
  const hourly = hourlyOf(json);
  if (!hourly) throw new Error('Invalid forecast response');
  const time = hourly.time as string[];
  const temperature = numberSeries(hourly, 'temperature_2m');
  const apparent = numberSeries(hourly, 'apparent_temperature');
  const precipProbability = numberSeries(hourly, 'precipitation_probability');
  const precip = numberSeries(hourly, 'precipitation');
  const weatherCode = numberSeries(hourly, 'weather_code');
  const wind = numberSeries(hourly, 'wind_speed_10m');
  const windGusts = numberSeries(hourly, 'wind_gusts_10m');
  if (!temperature || !apparent || !precipProbability || !precip || !weatherCode || !wind || !windGusts) {
    throw new Error('Invalid forecast response');
  }
  return time.map((value, index) => ({
    time: value,
    temperatureC: temperature[index],
    apparentC: apparent[index],
    precipProbabilityPct: precipProbability[index],
    precipMm: precip[index],
    weatherCode: weatherCode[index],
    windKmh: wind[index],
    windGustKmh: windGusts[index],
  }));
}

export function parseAirQuality(json: unknown): { time: string; pm25: number }[] {
  const hourly = hourlyOf(json);
  if (!hourly) throw new Error('Invalid air quality response');
  const time = hourly.time as string[];
  const pm = numberSeries(hourly, 'pm2_5');
  if (!pm) throw new Error('Invalid air quality response');
  const raw = hourly.pm2_5 as (number | null)[];
  const result: { time: string; pm25: number }[] = [];
  for (let i = 0; i < time.length; i++) {
    if (typeof raw[i] === 'number') result.push({ time: time[i], pm25: raw[i] as number });
  }
  return result;
}

export function parseGeocoding(json: unknown): Place[] {
  if (!isRecord(json) || !Array.isArray(json.results)) return [];
  const places: Place[] = [];
  for (const item of json.results) {
    if (!isRecord(item)) continue;
    if (typeof item.name !== 'string' || typeof item.latitude !== 'number' || typeof item.longitude !== 'number')
      continue;
    places.push({
      name: item.name,
      country: typeof item.country === 'string' ? item.country : '',
      admin1: typeof item.admin1 === 'string' ? item.admin1 : null,
      lat: item.latitude,
      lon: item.longitude,
    });
  }
  return places;
}

export async function fetchForecast(
  lat: number,
  lon: number,
  fetchFn: typeof fetch = fetch,
): Promise<HourlyForecast[]> {
  const response = await fetchFn(buildForecastUrl(lat, lon));
  if (!response.ok) throw new Error(`Forecast request failed: ${response.status}`);
  return parseForecast(await response.json());
}

export async function fetchAirQuality(
  lat: number,
  lon: number,
  fetchFn: typeof fetch = fetch,
): Promise<{ time: string; pm25: number }[]> {
  try {
    const response = await fetchFn(buildAirQualityUrl(lat, lon));
    if (!response.ok) return [];
    return parseAirQuality(await response.json());
  } catch {
    return [];
  }
}

export async function searchPlaces(query: string, fetchFn: typeof fetch = fetch): Promise<Place[]> {
  const response = await fetchFn(buildGeocodingUrl(query));
  if (!response.ok) return [];
  return parseGeocoding(await response.json());
}
