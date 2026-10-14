import i18n, { localeForLanguage } from '@/i18n';

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Belgrade';
}

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function localMidnightInstant(iso: string): string {
  return new Date(`${iso}T00:00:00`).toISOString();
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

type DateFormatKind = 'short' | 'long' | 'month';

const DATE_FORMATS: Record<DateFormatKind, Intl.DateTimeFormatOptions> = {
  short: { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' },
  long: { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' },
  month: { month: 'long', year: 'numeric', timeZone: 'UTC' },
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(kind: DateFormatKind): Intl.DateTimeFormat {
  const locale = localeForLanguage(i18n.language);
  const cacheKey = `${kind}:${locale}`;
  const cached = formatters.get(cacheKey);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat(locale, DATE_FORMATS[kind]);
  formatters.set(cacheKey, formatter);
  return formatter;
}

export function formatDateShort(iso: string): string {
  return formatterFor('short').format(new Date(`${iso}T00:00:00.000Z`));
}

export function formatDateLong(iso: string): string {
  return formatterFor('long').format(new Date(`${iso}T00:00:00.000Z`));
}

export function formatMonth(iso: string): string {
  return formatterFor('month').format(new Date(`${iso}T00:00:00.000Z`));
}
