import { useState } from 'react';
import { buildCoachInsights, type Insight, type InsightTone } from '@runcast/shared';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { useScaleWeek } from '@/features/plans/queries';
import type { RunLogsRow, WorkoutsRow } from '@/types';

const APPLIED_KEY = 'runcast.coach.applied';

const ACTION_LABELS: Record<string, string> = {
  'missed-runs': 'Smanji sledeću nedelju 20%',
  'high-rpe': 'Smanji 10%',
  'rpe-drift': 'Ostavi kako je',
  'long-run-missed': 'Ostavi kako je',
  'ready-to-build': 'Povećaj 10%',
};

const TONE_BADGES: Record<InsightTone, { tone: 'success' | 'warning' | 'neutral'; label: string }> = {
  positive: { tone: 'success', label: 'Napredak' },
  warning: { tone: 'warning', label: 'Pažnja' },
  neutral: { tone: 'neutral', label: 'Info' },
};

function readApplied(): Record<string, number> {
  try {
    const raw = localStorage.getItem(APPLIED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeApplied(value: Record<string, number>): void {
  try {
    localStorage.setItem(APPLIED_KEY, JSON.stringify(value));
  } catch {
    return;
  }
}

function sessionsLabel(count: number): string {
  return `${count} ${count === 1 ? 'trening' : 'treninga'}`;
}

interface CoachInsightsCardProps {
  workouts: WorkoutsRow[];
  logs: RunLogsRow[];
  today: string;
  raceDate: string;
}

export function CoachInsightsCard({ workouts, logs, today, raceDate }: CoachInsightsCardProps) {
  const scaleWeek = useScaleWeek();
  const [applied, setApplied] = useState<Record<string, number>>(readApplied);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { insights, recap } = buildCoachInsights({ workouts, logs, today, plan: { raceDate } });

  async function applyAction(insight: Insight) {
    if (!insight.action) return;
    setFeedback(null);
    try {
      await scaleWeek.mutateAsync({ weekStart: insight.action.weekStart, factor: insight.action.factor });
      const next = { ...applied, [insight.action.weekStart]: insight.action.factor };
      writeApplied(next);
      setApplied(next);
      setFeedback(
        `Nedelja od ${insight.action.weekStart.slice(8, 10)}.${insight.action.weekStart.slice(5, 7)}. je prilagođena.`,
      );
    } catch {
      setFeedback('Nije uspelo — pokušaj ponovo.');
    }
  }

  return (
    <AppCard data-testid="coach-card" className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Prošla nedelja</p>
        <span className="text-[11px] text-text-muted">
          {recap.weekStart.slice(8, 10)}.{recap.weekStart.slice(5, 7)}.
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-text-secondary">Planirano</dt>
        <dd className="text-right font-medium">
          {recap.plannedKm} km · {sessionsLabel(recap.plannedSessions)}
        </dd>
        <dt className="text-text-secondary">Urađeno</dt>
        <dd className="text-right font-medium">
          {recap.doneKm} km · {sessionsLabel(recap.doneSessions)}
        </dd>
        <dt className="text-text-secondary">Najduži trk</dt>
        <dd className="text-right font-medium">{recap.longestKm > 0 ? `${recap.longestKm} km` : '—'}</dd>
        <dt className="text-text-secondary">Ispunjeno</dt>
        <dd className="text-right font-medium">{recap.adherencePct}%</dd>
      </dl>

      {insights.length === 0 ? (
        recap.plannedSessions > 0 ? (
          <p className="text-sm text-text-muted">Sve izgleda stabilno — nastavi ovako.</p>
        ) : null
      ) : (
        <ul className="space-y-3">
          {insights.map((insight) => {
            const tone = TONE_BADGES[insight.tone];
            const label = ACTION_LABELS[insight.id];
            const weekApplied = insight.action ? applied[insight.action.weekStart] !== undefined : false;
            return (
              <li key={insight.id} className="space-y-2 rounded-xl bg-surface-elevated p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{insight.title}</p>
                  <AppBadge tone={tone.tone}>{tone.label}</AppBadge>
                </div>
                <p className="text-xs text-text-secondary">{insight.description}</p>
                {insight.action && label && !weekApplied ? (
                  <AppButton size="sm" loading={scaleWeek.isPending} onClick={() => void applyAction(insight)}>
                    {label}
                  </AppButton>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {feedback ? <p className="text-xs text-text-muted">{feedback}</p> : null}
    </AppCard>
  );
}
