import { hydrationForTemp, runWindowHours, type FuelingPlan, type RunWindow } from '@runcast/shared';
import { Droplets } from 'lucide-react';
import { AppCard } from '@/components/ui/AppCard';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface FuelingCardProps {
  plan: FuelingPlan;
  apparentC: number | null;
  runWindow: RunWindow;
}

function preBlockLabel(runWindow: RunWindow): string {
  const { startHour } = runWindowHours(runWindow);
  if (runWindow === 'morning') return 'Pre · obrok do 07:00';
  if (runWindow === 'evening') return `Pre · obrok do ${String(startHour - 2).padStart(2, '0')}:00`;
  return 'Pre';
}

export function FuelingCard({ plan, apparentC, runWindow }: FuelingCardProps) {
  const hot = apparentC !== null && apparentC >= 25;

  return (
    <AppCard className="space-y-4" data-testid="fueling-card">
      <SectionHeader
        label="Gorivo"
        action={
          apparentC !== null ? (
            <span className="num flex items-center gap-1 text-caption text-text-muted">
              <Droplets className="h-3.5 w-3.5" aria-hidden />
              osećaj {Math.round(apparentC)}°
            </span>
          ) : null
        }
      />

      <div className="space-y-1.5">
        <p className="section-label">{preBlockLabel(runWindow)}</p>
        <ul className="space-y-1 text-sm text-text-secondary">
          {plan.pre.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <p className="section-label">Tokom</p>
        <p className="text-sm text-text-secondary">
          Voda: <span className="num">{hydrationForTemp(apparentC)}</span>
        </p>
        {plan.during.length > 0 ? (
          <ul className="space-y-1">
            {plan.during.map((cue) => (
              <li key={cue.atSec} className="flex items-baseline gap-2 text-sm">
                <span className="num w-14 shrink-0 font-medium text-text">{Math.round(cue.atSec / 60)} min</span>
                <span className="text-text-secondary">{cue.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">Kratko je — voda je dovoljna, gel nije neophodan.</p>
        )}
        {hot ? <p className="text-sm text-warning-ink">Vruće je — gel na ~30 min i više vode.</p> : null}
      </div>

      <div className="space-y-1.5">
        <p className="section-label">Posle</p>
        <ul className="space-y-1 text-sm text-text-secondary">
          {plan.post.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </AppCard>
  );
}
