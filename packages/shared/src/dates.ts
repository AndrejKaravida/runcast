export const MS_PER_DAY = 86_400_000;

export function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(parseIso(iso).getTime() + days * MS_PER_DAY));
}

export function dayDiff(from: string, to: string): number {
  return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / MS_PER_DAY);
}

export function weekdayOf(iso: string): number {
  return (parseIso(iso).getUTCDay() + 6) % 7;
}

export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayOf(iso));
}
