import { formatDuration, isGuidedRunType, type RescheduleSuggestion, type RescheduleSwapOption } from '@runcast/shared';
import { clsx } from 'clsx';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppLinkButton } from '@/components/ui/AppLinkButton';
import { StatRow } from '@/components/ui/StatRow';
import { WeatherBanner } from '@/components/weather/WeatherBanner';
import type { AssessmentText } from '@/components/weather/weather-utils';
import { PaceZoneBadge } from '@/components/workouts/PaceZoneBadge';
import { WorkoutTypeIcon } from '@/components/workouts/WorkoutTypeIcon';
import type { HeroStat } from '@/features/workouts/utils';
import {
  phaseBarClass,
  statusTone,
  TONE_TEXT_CLASSES,
  typeLabel,
  typeTone,
  workoutSteps,
} from '@/features/workouts/utils';
import { formatDateLong } from '@/lib/dates';
import { workoutTitle } from '@/lib/workout-title';
import type { WorkoutsRow } from '@/types';

interface TodayHeroCardProps {
  workout: WorkoutsRow;
  today: string;
  stats: HeroStat[];
  isStrength: boolean;
  verdict: AssessmentText | null;
  reschedule: RescheduleSuggestion | null;
  candidate: WorkoutsRow | null;
  promptDismissed: boolean;
  rescheduleApplied: boolean;
  swapPending: boolean;
  swapError: string | null;
  completePending: boolean;
  completeError: string | null;
  onApplyOption: (option: RescheduleSwapOption) => void;
  onLegacySwap: () => void;
  onLegacyStay: () => void;
  onDismissPrompt: () => void;
  onComplete: () => void;
  onOpenLog: () => void;
}

export function TodayHeroCard({
  workout,
  today,
  stats,
  isStrength,
  verdict,
  reschedule,
  candidate,
  promptDismissed,
  rescheduleApplied,
  swapPending,
  swapError,
  completePending,
  completeError,
  onApplyOption,
  onLegacySwap,
  onLegacyStay,
  onDismissPrompt,
  onComplete,
  onOpenLog,
}: TodayHeroCardProps) {
  const { t } = useTranslation('today');
  const showWeatherBanner = Boolean(verdict || reschedule || rescheduleApplied);

  return (
    <AppCard data-testid="today-hero" className="space-y-4 overflow-hidden">
      <div className={clsx('-mx-4 -mt-4 h-1', phaseBarClass(workout.phase))} aria-hidden />
      <div className="flex items-center justify-between gap-3">
        <p className="section-label flex min-w-0 items-center gap-1.5">
          <WorkoutTypeIcon
            type={workout.type}
            className={clsx('h-4 w-4 shrink-0', TONE_TEXT_CLASSES[typeTone(workout.type)])}
          />
          <span className="truncate">
            {t('label')} · {formatDateLong(today)}
          </span>
        </p>
        {workout.status !== 'PLANNED' ? (
          <AppBadge tone={statusTone(workout.status)}>
            {workout.status === 'DONE' ? t('status.done') : t('status.skipped')}
          </AppBadge>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-3">
        <p data-testid="today-workout-title" className="text-2xl font-semibold tracking-display">
          {workoutTitle(t, workout)}
        </p>
        <PaceZoneBadge zone={workout.pace_zone} />
      </div>

      <p className="num text-sm text-text-secondary">
        {typeLabel(t, workout.type)}
        {workout.distance_km > 0 ? ` · ${workout.distance_km} km` : ''}
        {workout.duration_sec ? ` · ${formatDuration(workout.duration_sec)}` : ''}
      </p>

      {showWeatherBanner ? (
        <WeatherBanner
          verdict={verdict}
          suggestion={reschedule}
          candidate={candidate}
          promptDismissed={promptDismissed}
          applied={rescheduleApplied}
          swapPending={swapPending}
          swapError={swapError}
          onApplyOption={onApplyOption}
          onLegacySwap={onLegacySwap}
          onLegacyStay={onLegacyStay}
          onDismissPrompt={onDismissPrompt}
        />
      ) : null}

      {stats.length >= 2 ? <StatRow items={stats} className="rounded-xl bg-surface-elevated py-1" /> : null}

      <div className="space-y-2">
        <div className="flex gap-2">
          {workout.status === 'PLANNED' && workout.type !== 'REST' ? (
            isStrength ? (
              <AppButton
                size="lg"
                className="flex-1"
                loading={completePending}
                data-testid="complete-strength"
                onClick={onComplete}
              >
                <CheckCircle2 className="h-5 w-5" aria-hidden /> {t('actions.completeStrength')}
              </AppButton>
            ) : (
              <AppButton size="lg" className="flex-1" data-testid="log-done" onClick={onOpenLog}>
                <CheckCircle2 className="h-5 w-5" aria-hidden /> {t('actions.done')}
              </AppButton>
            )
          ) : null}
          {isGuidedRunType(workout.type) && workout.status === 'PLANNED' && workoutSteps(workout).length > 0 ? (
            <AppLinkButton
              to={`/run/${workout.id}`}
              variant="secondary"
              size="lg"
              className="w-full flex-1"
              data-testid="start-guided"
            >
              {t('actions.guided')}
            </AppLinkButton>
          ) : null}
        </div>
        {completeError ? <p className="text-caption text-danger-ink">{completeError}</p> : null}
        <Link
          to={`/workout/${workout.id}`}
          className="block text-center text-sm font-medium text-primary-ink hover:text-primary-ink-hover"
        >
          {t('actions.view')}
        </Link>
      </div>
    </AppCard>
  );
}
