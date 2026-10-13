import { useMemo, useState } from 'react';
import { buildPacePlan, formatDuration, formatPace, type RaceStrategy } from '@runcast/shared';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppCard } from '@/components/ui/AppCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

interface RaceDayCardProps {
  goalTimeSec: number;
  distanceKm: number;
}

export function RaceDayCard({ goalTimeSec, distanceKm }: RaceDayCardProps) {
  const { t } = useTranslation('race');
  const [strategy, setStrategy] = useState<RaceStrategy>('even');
  const splits = useMemo(() => buildPacePlan(goalTimeSec, distanceKm, strategy), [goalTimeSec, distanceKm, strategy]);
  const goalPaceSecPerKm = Math.round(goalTimeSec / distanceKm);
  const firstKmNote = distanceKm >= 15 ? t('day.noteLong') : distanceKm >= 7.5 ? t('day.noteMid') : t('day.noteShort');

  return (
    <AppCard className="space-y-3">
      <SectionHeader
        label={t('day.title')}
        action={<AppBadge tone="primary">{formatDuration(goalTimeSec)}</AppBadge>}
      />
      <SegmentedControl
        value={strategy}
        onChange={setStrategy}
        options={[
          { value: 'even', label: t('day.even') },
          { value: 'negative', label: t('day.negative') },
        ]}
      />
      <p className="num text-caption text-text-muted">{t('day.goalPace', { pace: formatPace(goalPaceSecPerKm) })}</p>
      <table data-testid="pace-plan" className="w-full text-sm">
        <thead>
          <tr>
            <th className="section-label pb-2 text-left">{t('day.segment')}</th>
            <th className="section-label pb-2 pl-2 text-right">{t('day.perKm')}</th>
            <th className="section-label pb-2 pl-2 text-right">{t('day.time')}</th>
            <th className="section-label pb-2 pl-2 text-right">{t('day.total')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {splits.map((split) => (
            <tr key={split.cumulativeSec} data-testid="split-row">
              <td className="num py-2 text-text-secondary">{t(split.label.key, split.label.params)}</td>
              <td className="num py-2 pl-2 text-right">{formatPace(split.paceSecPerKm)}</td>
              <td className="num py-2 pl-2 text-right">{formatDuration(split.segmentSec)}</td>
              <td className="num py-2 pl-2 text-right font-medium">{formatDuration(split.cumulativeSec)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="rounded-xl bg-surface-elevated p-3">
        <p className="section-label">{t('day.firstKm')}</p>
        <p className="mt-1 text-caption text-text-secondary">{firstKmNote}</p>
      </div>
    </AppCard>
  );
}
