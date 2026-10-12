export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  return new Date(date.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

export function weekdayIndex(iso: string): number {
  return (new Date(`${iso}T00:00:00.000Z`).getUTCDay() + 6) % 7;
}

export function startOfWeekIso(iso: string): string {
  return addDaysIso(iso, -weekdayIndex(iso));
}

export function endOfWeekIso(iso: string): string {
  return addDaysIso(startOfWeekIso(iso), 6);
}

export function dayDiff(from: string, to: string): number {
  const fromTime = new Date(`${from}T00:00:00.000Z`).getTime();
  const toTime = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.round((toTime - fromTime) / 86_400_000);
}

export function firstDayOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function addMonthsIso(iso: string, months: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)).toISOString().slice(0, 10);
}

export function lastDayOfMonth(iso: string): string {
  return addDaysIso(addMonthsIso(firstDayOfMonth(iso), 1), -1);
}

const dateFormatter = new Intl.DateTimeFormat('sr-Latn-RS', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const longDateFormatter = new Intl.DateTimeFormat('sr-Latn-RS', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const monthFormatter = new Intl.DateTimeFormat('sr-Latn-RS', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function formatDateShort(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T00:00:00.000Z`));
}

export function formatDateLong(iso: string): string {
  return longDateFormatter.format(new Date(`${iso}T00:00:00.000Z`));
}

export function formatMonth(iso: string): string {
  return monthFormatter.format(new Date(`${iso}T00:00:00.000Z`));
}
