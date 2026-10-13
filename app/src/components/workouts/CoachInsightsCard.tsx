import { useState } from 'react';
import { buildCoachInsights, type Insight, type InsightTone } from '@runcast/shared';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useScaleWeek } from '@/features/plans/queries';
import type { RunLogsRow, WorkoutsRow } from '@/types';

const APPLIED_KEY = 'runcast.coach.applied';

const TONE_BADGES: Record<InsightTone, { tone: 'success' | 'warning' | 'neutral'; labelKey: string }> = {
  positive: { tone: 'success', labelKey: 'coach.tones.positive' },
  warning: { tone: 'warning', labelKey: 'coach.tones.warning' },
  neutral: { tone: 'neutral', labelKey: 'coach.tones.neutral' },
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

interface CoachInsightsCardProps {
  workouts: WorkoutsRow[];
  logs: RunLogsRow[];
  today: string;
  raceDate: string;
}

export function CoachInsightsCard({ workouts, logs, today, raceDate }: CoachInsightsCardProps) {
  const { t } = useTranslation('stats');
  const scaleWeek = useScaleWeek();
  const [applied, setApplied] = useState<Record<string, number>>(readApplied);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { insights, recap } = buildCoachInsights({ workouts, logs, today, plan: { raceDate } });

  function sessionsLabel(count: number): string {
    return count === 1 ? t('coach.sessionsOne', { count }) : t('coach.sessionsMany', { count });
  }

  async function applyAction(insight: Insight) {
    if (!insight.action) return;
    setFeedback(null);
    try {
      await scaleWeek.mutateAsync({ weekStart: insight.action.weekStart, factor: insight.action.factor });
      const next = { ...applied, [insight.action.weekStart]: insight.action.factor };
      writeApplied(next);
      setApplied(next);
      setFeedback(
        t('coach.weekAdjusted', {
          day: insight.action.weekStart.slice(8, 10),
          month: insight.action.weekStart.slice(5, 7),
        }),
      );
    } catch {
      setFeedback(t('coach.applyFailed'));
    }
  }

  const recapItems = [
    { label: t('coach.planned'), value: `${recap.plannedKm} km · ${sessionsLabel(recap.plannedSessions)}` },
    { label: t('coach.done'), value: `${recap.doneKm} km · ${sessionsLabel(recap.doneSessions)}` },
    { label: t('coach.longest'), value: recap.longestKm > 0 ? `${recap.longestKm} km` : '—' },
    { label: t('coach.adherence'), value: `${recap.adherencePct}%` },
  ];

  return (
    <AppCard data-testid="coach-card" className="space-y-3">
      <SectionHeader
        label={t('coach.title')}
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
          <p className="text-sm text-text-muted">{t('coach.underControl')}</p>
        ) : null
      ) : (
        <ul className="space-y-3">
          {insights.map((insight) => {
            const tone = TONE_BADGES[insight.tone];
            const weekApplied = insight.action ? applied[insight.action.weekStart] !== undefined : false;
            return (
              <li key={insight.id} className="space-y-2 rounded-xl bg-surface-elevated p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{t(insight.titleKey, insight.titleParams)}</p>
                  <AppBadge tone={tone.tone}>{t(tone.labelKey)}</AppBadge>
                </div>
                <p className="text-caption text-text-secondary">
                  {t(insight.descriptionKey, insight.descriptionParams)}
                </p>
                {insight.action && insight.actionLabelKey && !weekApplied ? (
                  <AppButton size="sm" loading={scaleWeek.isPending} onClick={() => void applyAction(insight)}>
                    {t(insight.actionLabelKey)}
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
