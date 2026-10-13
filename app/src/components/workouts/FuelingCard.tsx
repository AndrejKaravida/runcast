import { hydrationForTemp, runWindowHours, type FuelingPlan, type RunWindow } from '@runcast/shared';
import { Droplets } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppCard } from '@/components/ui/AppCard';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface FuelingCardProps {
  plan: FuelingPlan;
  apparentC: number | null;
  runWindow: RunWindow;
}

export function FuelingCard({ plan, apparentC, runWindow }: FuelingCardProps) {
  const { t } = useTranslation('workout');
  const hot = apparentC !== null && apparentC >= 25;
  const { startHour } = runWindowHours(runWindow);
  const preLabel =
    runWindow === 'morning'
      ? t('fueling.preMorning')
      : runWindow === 'evening'
        ? t('fueling.preEvening', { time: String(startHour - 2).padStart(2, '0') })
        : t('fueling.pre');

  return (
    <AppCard className="space-y-4" data-testid="fueling-card">
      <SectionHeader
        label={t('fueling.title')}
        action={
          apparentC !== null ? (
            <span className="num flex items-center gap-1 text-caption text-text-muted">
              <Droplets className="h-3.5 w-3.5" aria-hidden />
              {t('fueling.feelsLike', { temp: Math.round(apparentC) })}
            </span>
          ) : null
        }
      />

      <div className="space-y-1.5">
        <p className="section-label">{preLabel}</p>
        <ul className="space-y-1 text-sm text-text-secondary">
          {plan.pre.map((line, index) => (
            <li key={`${line.key}-${index}`}>{t(line.key, line.params)}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <p className="section-label">{t('fueling.during')}</p>
        <p className="text-sm text-text-secondary">
          {t('fueling.water')} <span className="num">{t(hydrationForTemp(apparentC))}</span>
        </p>
        {plan.during.length > 0 ? (
          <ul className="space-y-1">
            {plan.during.map((cue) => (
              <li key={cue.atSec} className="flex items-baseline gap-2 text-sm">
                <span className="num w-14 shrink-0 font-medium text-text">{Math.round(cue.atSec / 60)} min</span>
                <span className="text-text-secondary">{t(cue.text.key, cue.text.params)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">{t('fueling.short')}</p>
        )}
        {hot ? <p className="text-sm text-warning-ink">{t('fueling.hot')}</p> : null}
      </div>

      <div className="space-y-1.5">
        <p className="section-label">{t('fueling.after')}</p>
        <ul className="space-y-1 text-sm text-text-secondary">
          {plan.post.map((line, index) => (
            <li key={`${line.key}-${index}`}>{t(line.key, line.params)}</li>
          ))}
        </ul>
      </div>
    </AppCard>
  );
}
