import { useState } from 'react';
import { buildCoachInsights, type Insight, type InsightTone } from '@runcast/shared';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useScaleWeek } from '@/features/plans/queries';
import type { RunLogsRow, WorkoutsRow } from '@/types';

const APPLIED_KEY = 'runcast.coach.applied';

const ACTION_LABELS: Record<string, string> = {
  'missed-runs': 'Olakšaj sledeću nedelju 20%',
  'high-rpe': 'Olakšaj 10%',
  'rpe-drift': 'Bez promene',
  'long-run-missed': 'Bez promene',
  'ready-to-build': 'Dodaj 10%',
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

  const recapItems = [
    { label: 'Planirano', value: `${recap.plannedKm} km · ${sessionsLabel(recap.plannedSessions)}` },
    { label: 'Urađeno', value: `${recap.doneKm} km · ${sessionsLabel(recap.doneSessions)}` },
    { label: 'Najduži trk', value: recap.longestKm > 0 ? `${recap.longestKm} km` : '—' },
    { label: 'Ispunjeno', value: `${recap.adherencePct}%` },
  ];

  return (
    <AppCard data-testid="coach-card" className="space-y-3">
      <SectionHeader
        label="Prošla nedelja"
        action={
          <span className="num text-caption text-text-muted">
            {recap.weekStart.slice(8, 10)}.{recap.weekStart.slice(5, 7)}.
          </span>
        }
      />

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        {recapItems.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="section-label">{item.label}</dt>
            <dd className="num truncate text-sm font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>

      {insights.length === 0 ? (
        recap.plannedSessions > 0 ? (
          <p className="text-sm text-text-muted">Sve držiš pod kontrolom — samo nastavi.</p>
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
                <p className="text-caption text-text-secondary">{insight.description}</p>
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

      {feedback ? <p className="text-caption text-text-muted">{feedback}</p> : null}
    </AppCard>
  );
}
