import { describe, expect, it } from 'vitest';
import { bestWindow } from './weather-focus';
import type { HourlyForecast } from './weather';

function hour(time: string, overrides: Partial<HourlyForecast> = {}): HourlyForecast {
  return {
    time,
    temperatureC: 15,
    apparentC: 15,
    precipProbabilityPct: 0,
    precipMm: 0,
    weatherCode: 1,
    windKmh: 5,
    windGustKmh: 10,
    ...overrides,
  };
}

function dayHours(date: string, hours: number[], overrides: Partial<HourlyForecast> = {}): HourlyForecast[] {
  return hours.map((value) => hour(`${date}T${String(value).padStart(2, '0')}:00`, overrides));
}

const today = '2026-01-05';
const range = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const rain = { precipProbabilityPct: 90, precipMm: 3 };

describe('bestWindow', () => {
  it('returns null when the date has no forecast hours', () => {
    expect(bestWindow(dayHours('2026-01-06', range), [], today)).toBeNull();
  });

  it('returns null when forecast hours fall outside the range', () => {
    const hours = [...dayHours(today, [3, 4, 5]), ...dayHours(today, [22, 23])];
    expect(bestWindow(hours, [], today)).toBeNull();
  });

  it('picks the clearest window and carries its summary', () => {
    const rainy = dayHours(today, [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], rain);
    const clear = dayHours(today, [18, 19, 20]);
    expect(bestWindow([...rainy, ...clear], [], today)).toEqual({
      startHour: 18,
      endHour: 20,
      score: 100,
      precipPct: 0,
      precipMm: 0,
      apparentC: 15,
      windGust: 10,
      pm25: 0,
    });
  });

  it('breaks ties toward the earliest window', () => {
    expect(bestWindow(dayHours(today, range), [], today)).toMatchObject({ startHour: 6, endHour: 8, score: 100 });
  });

  it('supports a custom range', () => {
    expect(bestWindow(dayHours(today, range), [], today, 15, 21)).toMatchObject({ startHour: 15, endHour: 17 });
  });

  it('skips windows that contain a storm', () => {
    const hours = dayHours(today, range).map((entry) =>
      entry.time === `${today}T07:00` ? { ...entry, weatherCode: 96 } : entry,
    );
    expect(bestWindow(hours, [], today)).toMatchObject({ startHour: 8, endHour: 10, score: 100 });
  });

  it('still returns a window when every option is poor', () => {
    const scored = bestWindow(dayHours(today, [9, 10, 11, 12], rain), [], today);
    expect(scored).toMatchObject({ startHour: 8, endHour: 10, score: 22, precipPct: 90, precipMm: 3 });
  });
});
