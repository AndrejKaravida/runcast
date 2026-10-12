import type { WorkoutExplanation } from '@runcast/shared';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppCard } from '@/components/ui/AppCard';

interface WhyCardProps {
  explanation: WorkoutExplanation;
}

export function WhyCard({ explanation }: WhyCardProps) {
  const [rpe, ...cueParts] = explanation.effort.split(' — ');
  const cue = cueParts.join(' — ');

  return (
    <AppCard data-testid="why-card" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Zašto ovaj trening</p>
        <AppBadge tone="primary" className="shrink-0">
          {rpe}
        </AppBadge>
      </div>
      <p className="text-sm text-text-secondary">{explanation.why}</p>
      <ul className="divide-y divide-border">
        {explanation.how.map((item, index) => (
          <li key={`${item}-${index}`} className="py-2 text-sm">
            {item}
          </li>
        ))}
      </ul>
      {cue ? <p className="text-xs text-text-muted">{cue}</p> : null}
      <div className="rounded-xl bg-warning-soft p-3 text-xs text-warning-ink">
        <p className="font-semibold">Česta greška</p>
        <p className="mt-0.5">{explanation.mistake}</p>
      </div>
    </AppCard>
  );
}
