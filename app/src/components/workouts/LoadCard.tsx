import { trainingLoad, type LoadBand } from '@runcast/shared';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppCard } from '@/components/ui/AppCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { RunLogsRow } from '@/types';

const WEEKS = 8;

const BAND_TONES: Record<LoadBand, 'neutral' | 'success' | 'warning' | 'danger'> = {
  insufficient: 'neutral',
  low: 'neutral',
  sweet: 'success',
  caution: 'warning',
  high: 'danger',
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function weekLabel(date: string): string {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}.`;
}

interface LoadCardProps {
  logs: RunLogsRow[];
  today: string;
}

export function LoadCard({ logs, today }: LoadCardProps) {
  const { t } = useTranslation('stats');
  const reduceMotion = useReducedMotion();
  const load = trainingLoad(logs, today);
  const weeks = Array.from({ length: WEEKS }, (_, index) => load.days.slice(index * 7, index * 7 + 7));
  const weekSums = weeks.map((days) => round1(days.reduce((sum, day) => sum + day.load, 0)));
  const maxWeek = Math.max(...weekSums, 1);

  return (
    <AppCard data-testid="load-card" className="space-y-3">
      <SectionHeader
        label={t('load.title')}
        action={<AppBadge tone={BAND_TONES[load.band]}>{t(`load.bands.${load.band}`)}</AppBadge>}
      />
      <div className="flex gap-1.5">
        {weekSums.map((sum, index) => (
          <div key={weeks[index][0].date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="num h-4 text-caption text-text-muted">{sum > 0 ? Math.round(sum) : ''}</span>
            <div className="relative h-24 w-5 sm:w-6" title={t('load.barTooltip', { load: sum })}>
              <motion.div
                className="absolute inset-x-0 bottom-0 rounded-t-md bg-chart-bar"
                style={{ height: `${(sum / maxWeek) * 100}%`, transformOrigin: 'bottom' }}
                initial={reduceMotion ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', bounce: 0, duration: 0.35, delay: Math.min(index, 6) * 0.035 }
                }
              />
            </div>
            <span className="num max-w-full truncate text-caption text-text-muted">
              {weekLabel(weeks[index][0].date)}
            </span>
          </div>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        <div className="min-w-0">
          <dt className="section-label">{t('load.acute')}</dt>
          <dd className="num truncate text-sm font-medium" data-testid="load-acute">
            {load.acute7}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="section-label">{t('load.acwr')}</dt>
          <dd className="num truncate text-sm font-medium">{load.band === 'insufficient' ? '—' : load.acwr}</dd>
        </div>
      </dl>
      <p className="text-caption text-text-secondary">{t(`load.explanations.${load.band}`)}</p>
      <p className="text-caption text-text-muted">{t('load.note')}</p>
    </AppCard>
  );
}
