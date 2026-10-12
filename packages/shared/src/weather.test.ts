import { describe, expect, it } from 'vitest';
import {
  buildAirQualityUrl,
  buildForecastUrl,
  buildGeocodingUrl,
  fetchAirQuality,
  fetchForecast,
  parseAirQuality,
  parseForecast,
  parseGeocoding,
} from './weather';

const forecastFixture = {
  hourly: {
    time: ['2026-01-05T06:00', '2026-01-05T07:00', '2026-01-05T08:00'],
    temperature_2m: [5, 5.5, null],
    apparent_temperature: [3, 3.5, 2],
    precipitation_probability: [10, 20, 30],
    precipitation: [0, 0.1, 0],
    weather_code: [1, 2, 3],
    wind_speed_10m: [10, 12, 14],
    wind_gusts_10m: [20, 25, 30],
  },
};

describe('weather urls', () => {
  it('builds forecast url with hourly list and default days', () => {
    const url = buildForecastUrl(44.8, 20.5);
    expect(url).toContain('api.open-meteo.com/v1/forecast');
    expect(url).toContain('forecast_days=7');
    expect(decodeURIComponent(url)).toContain(
      'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
    );
  });

  it('supports custom forecast days', () => {
    expect(buildForecastUrl(44.8, 20.5, 16)).toContain('forecast_days=16');
  });

  it('builds air quality and geocoding urls', () => {
    expect(buildAirQualityUrl(44.8, 20.5)).toContain('air-quality-api.open-meteo.com');
    expect(buildGeocodingUrl('Novi Sad')).toContain('name=Novi+Sad');
  });
});

describe('parseForecast', () => {
  it('maps hourly arrays to objects and nulls to zero', () => {
    const hours = parseForecast(forecastFixture);
    expect(hours).toHaveLength(3);
    expect(hours[0]).toEqual({
      time: '2026-01-05T06:00',
      temperatureC: 5,
      apparentC: 3,
      precipProbabilityPct: 10,
      precipMm: 0,
      weatherCode: 1,
      windKmh: 10,
      windGustKmh: 20,
    });
    expect(hours[2].temperatureC).toBe(0);
  });

  it('throws on invalid payloads', () => {
    expect(() => parseForecast({})).toThrow('Invalid forecast response');
    expect(() => parseForecast({ hourly: { time: ['a'], temperature_2m: [1] } })).toThrow('Invalid forecast response');
  });
});

describe('parseAirQuality', () => {
  it('maps rows and skips nulls', () => {
    const rows = parseAirQuality({
      hourly: { time: ['2026-01-05T06:00', '2026-01-05T07:00', '2026-01-05T08:00'], pm2_5: [5, null, 12] },
    });
    expect(rows).toEqual([
      { time: '2026-01-05T06:00', pm25: 5 },
      { time: '2026-01-05T08:00', pm25: 12 },
    ]);
  });

  it('throws on invalid payloads', () => {
    expect(() => parseAirQuality({})).toThrow('Invalid air quality response');
  });
});

describe('parseGeocoding', () => {
  it('returns empty array without results', () => {
    expect(parseGeocoding({})).toEqual([]);
    expect(parseGeocoding({ results: [] })).toEqual([]);
  });

  it('maps places and defaults missing admin1', () => {
    const places = parseGeocoding({
      results: [{ name: 'Novi Sad', country: 'Srbija', latitude: 45.25, longitude: 19.84 }],
    });
    expect(places).toEqual([{ name: 'Novi Sad', country: 'Srbija', admin1: null, lat: 45.25, lon: 19.84 }]);
  });
});

describe('fetch helpers', () => {
  it('fetches and parses a forecast', async () => {
    const stub: typeof fetch = async () => new Response(JSON.stringify(forecastFixture), { status: 200 });
    const hours = await fetchForecast(44.8, 20.5, stub);
    expect(hours).toHaveLength(3);
  });

  it('returns an empty array when air quality fails', async () => {
    const failing: typeof fetch = async () => {
      throw new Error('network down');
    };
    expect(await fetchAirQuality(44.8, 20.5, failing)).toEqual([]);
  });
});
