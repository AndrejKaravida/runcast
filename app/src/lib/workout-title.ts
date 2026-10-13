import type { TFunction } from 'i18next';
import { workoutSteps } from '@/features/workouts/utils';
import i18n, { localeForLanguage } from '@/i18n';
import type { WorkoutsRow } from '@/types';

const formatters = new Map<string, Intl.NumberFormat>();

function formatKm(value: number): string {
  const locale = localeForLanguage(i18n.language);
  const cached = formatters.get(locale);
  if (cached) return cached.format(value);
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  formatters.set(locale, formatter);
  return formatter.format(value);
}

export function workoutTitle(t: TFunction, workout: WorkoutsRow): string {
  const steps = workoutSteps(workout);
  switch (workout.type) {
    case 'EASY':
      return t('workout:title.easy', { km: formatKm(workout.distance_km) });
    case 'LONG':
      return t('workout:title.long', { km: formatKm(workout.distance_km) });
    case 'TEMPO': {
      const durationSec = steps.find((step) => step.durationSec)?.durationSec ?? 0;
      return durationSec > 0 ? t('workout:title.tempo', { minutes: Math.round(durationSec / 60) }) : workout.title;
    }
    case 'INTERVALS':
      return steps.length > 2 ? t('workout:title.intervals', { reps: steps.length - 2 }) : workout.title;
    case 'REPETITIONS':
      return steps.length > 2 ? t('workout:title.repetitions', { reps: steps.length - 2 }) : workout.title;
    case 'RACE':
      return t('workout:title.race', { km: formatKm(workout.distance_km) });
    default:
      return workout.title;
  }
}
