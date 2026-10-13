import { useMemo, useState } from 'react';
import {
  benchmarkAnchor,
  buildBenchmarkPaceMap,
  buildBenchmarkSuggestion,
  isRaceApproaching,
  type PlanPaces,
} from '@runcast/shared';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useRecalibratePlan } from '@/features/plans/queries';

interface BenchmarkSuggestionCardProps {
  distanceKm: number;
  timeSec: number;
  paces: PlanPaces | null;
  daysToRace: number | null;
}

type Status = 'idle' | 'accepted' | 'rejected' | 'error';

export function BenchmarkSuggestionCard({ distanceKm, timeSec, paces, daysToRace }: BenchmarkSuggestionCardProps) {
  const { t } = useTranslation('benchmark');
  const recalibrate = useRecalibratePlan();
  const [status, setStatus] = useState<Status>('idle');
  const suggestion = useMemo(
    () => buildBenchmarkSuggestion({ distanceKm, timeSec, oldPaces: paces }),
    [distanceKm, timeSec, paces],
  );

  function deltaLabel(delta: number): string {
    if (delta === 0) return t('suggestion.same');
    return delta > 0 ? t('suggestion.slower', { delta }) : t('suggestion.faster', { delta: Math.abs(delta) });
  }

  async function accept() {
    const paceMap = paces ? buildBenchmarkPaceMap(paces, suggestion.paces) : {};
    try {
      await recalibrate.mutateAsync({
        anchor: benchmarkAnchor({ distanceKm, timeSec }),
        paces: suggestion.paces,
        paceMap,
      });
      setStatus('accepted');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'accepted') {
    return (
      <AppCard data-testid="benchmark-suggestion" className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success-ink" aria-hidden />
          <p className="text-sm font-semibold">{t('suggestion.updated')}</p>
        </div>
        <p className="text-sm text-text-secondary">{t('suggestion.updatedHint')}</p>
      </AppCard>
    );
  }

  if (status === 'rejected') {
    return (
      <AppCard data-testid="benchmark-suggestion" className="space-y-2">
        <p className="text-sm font-semibold">{t('suggestion.rejected')}</p>
      </AppCard>
    );
  }

  return (
    <AppCard data-testid="benchmark-suggestion" className="space-y-3">
      <SectionHeader
        label={t('suggestion.title')}
        action={
          <AppBadge tone="primary">{t('suggestion.vdot', { vdot: Math.round(suggestion.vdot * 10) / 10 })}</AppBadge>
        }
      />
      <ul className="divide-y divide-border">
        {suggestion.zones.map((zone) => (
          <li key={zone.zone} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t(zone.label.key)}</span>
              {zone.oldPace ? <span className="num block text-caption text-text-muted">{zone.oldPace}</span> : null}
            </span>
            <span className="shrink-0 text-right">
              <span className="num block text-sm font-semibold">{zone.newPace}</span>
              {zone.deltaSecPerKm !== null ? (
                <span
                  className={
                    zone.deltaSecPerKm < 0
                      ? 'num block text-caption text-success-ink'
                      : 'num block text-caption text-text-muted'
                  }
                >
                  {deltaLabel(zone.deltaSecPerKm)}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {daysToRace !== null && isRaceApproaching(daysToRace) ? (
        <p className="rounded-xl border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning-ink">
          {t('suggestion.raceWarning', { days: daysToRace })}
        </p>
      ) : null}
      {status === 'error' ? <p className="text-sm text-danger-ink">{t('suggestion.error')}</p> : null}
      <div className="flex gap-3">
        <AppButton
          variant="secondary"
          className="flex-1"
          disabled={recalibrate.isPending}
          onClick={() => setStatus('rejected')}
        >
          {t('suggestion.reject')}
        </AppButton>
        <AppButton className="flex-1" loading={recalibrate.isPending} onClick={() => void accept()}>
          {t('suggestion.accept')}
        </AppButton>
      </div>
    </AppCard>
  );
}
