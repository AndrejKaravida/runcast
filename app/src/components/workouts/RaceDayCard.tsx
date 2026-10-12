import { useMemo, useState } from 'react';
import { buildPacePlan, formatDuration, formatPace, type RaceStrategy } from '@runcast/shared';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppCard } from '@/components/ui/AppCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

interface RaceDayCardProps {
  goalTimeSec: number;
  distanceKm: number;
}

function firstKmNote(distanceKm: number): string {
  if (distanceKm >= 15) return 'Prvih 5 km 5–10 s/km sporije od cilja — čuvaj energiju za kraj.';
  if (distanceKm >= 7.5) return 'Prva 3 km ~5 s sporije, od 4. km ciljni tempo, zadnji km sve.';
  return 'Kontrolisano jako od starta, bez sprinta — zadnji km sve.';
}

export function RaceDayCard({ goalTimeSec, distanceKm }: RaceDayCardProps) {
  const [strategy, setStrategy] = useState<RaceStrategy>('even');
  const splits = useMemo(() => buildPacePlan(goalTimeSec, distanceKm, strategy), [goalTimeSec, distanceKm, strategy]);
  const goalPaceSecPerKm = Math.round(goalTimeSec / distanceKm);

  return (
    <AppCard className="space-y-3">
      <SectionHeader label="Plan tempa" action={<AppBadge tone="primary">{formatDuration(goalTimeSec)}</AppBadge>} />
      <SegmentedControl
        value={strategy}
        onChange={setStrategy}
        options={[
          { value: 'even', label: 'Ravnomerno' },
          { value: 'negative', label: 'Negativni split' },
        ]}
      />
      <p className="num text-caption text-text-muted">Ciljni tempo {formatPace(goalPaceSecPerKm)} /km (±3 s)</p>
      <table data-testid="pace-plan" className="w-full text-sm">
        <thead>
          <tr>
            <th className="section-label pb-2 text-left">Deonica</th>
            <th className="section-label pb-2 pl-2 text-right">/km</th>
            <th className="section-label pb-2 pl-2 text-right">Vreme</th>
            <th className="section-label pb-2 pl-2 text-right">Ukupno</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {splits.map((split) => (
            <tr key={split.label} data-testid="split-row">
              <td className="num py-2 text-text-secondary">{split.label}</td>
              <td className="num py-2 pl-2 text-right">{formatPace(split.paceSecPerKm)}</td>
              <td className="num py-2 pl-2 text-right">{formatDuration(split.segmentSec)}</td>
              <td className="num py-2 pl-2 text-right font-medium">{formatDuration(split.cumulativeSec)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="rounded-xl bg-surface-elevated p-3">
        <p className="section-label">Prvi kilometar</p>
        <p className="mt-1 text-caption text-text-secondary">{firstKmNote(distanceKm)}</p>
      </div>
    </AppCard>
  );
}
