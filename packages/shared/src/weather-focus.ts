import type { HourlyForecast } from './weather';
import { scoreWindow } from './weather-reschedule';

export interface BestWindow {
  startHour: number;
  endHour: number;
  score: number;
  precipPct: number;
  precipMm: number;
  apparentC: number;
  windGust: number;
  pm25: number;
}

const WINDOW_LENGTHS = [2, 3] as const;

function hourOf(time: string): number {
  return Number(time.slice(11, 13));
}

function hasWindowHour(available: Set<number>, startHour: number, endHour: number): boolean {
  for (let hour = startHour; hour < endHour; hour++) {
    if (available.has(hour)) return true;
  }
  return false;
}

export function bestWindow(
  hours: HourlyForecast[],
  pm25: { time: string; pm25: number }[],
  date: string,
  rangeStart = 6,
  rangeEnd = 21,
): BestWindow | null {
  const available = new Set(hours.filter((hour) => hour.time.startsWith(date)).map((hour) => hourOf(hour.time)));
  let best: BestWindow | null = null;
  for (const length of WINDOW_LENGTHS) {
    for (let start = rangeStart; start + length <= rangeEnd; start++) {
      if (!hasWindowHour(available, start, start + length)) continue;
      const scored = scoreWindow(hours, pm25, { startHour: start, endHour: start + length }, date);
      if (!best || scored.score > best.score) {
        best = { startHour: start, endHour: start + length, ...scored };
      }
    }
  }
  return best;
}
