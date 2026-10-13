import type { RescheduleShiftOption, RescheduleSuggestion, RescheduleSwapOption } from '@runcast/shared';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import type { AssessmentText } from '@/components/weather/weather-utils';
import { formatDateShort } from '@/lib/dates';
import type { WorkoutsRow } from '@/types';

const TONE_CLASSES = {
  rain: 'border-rain-ink bg-rain-soft',
  warning: 'border-warning-ink bg-warning-soft',
  danger: 'border-danger-ink bg-danger-soft',
} as const;

interface WeatherBannerProps {
  verdict: AssessmentText | null;
  suggestion: RescheduleSuggestion | null;
  candidate: WorkoutsRow | null;
  promptDismissed: boolean;
  applied: boolean;
  swapPending: boolean;
  swapError: string | null;
  onApplyOption: (option: RescheduleSwapOption) => void;
  onLegacySwap: () => void;
  onLegacyStay: () => void;
  onDismissPrompt: () => void;
}

export function WeatherBanner({
  verdict,
  suggestion,
  candidate,
  promptDismissed,
  applied,
  swapPending,
  swapError,
  onApplyOption,
  onLegacySwap,
  onLegacyStay,
  onDismissPrompt,
}: WeatherBannerProps) {
  const { t } = useTranslation('today');
  const { t: tContent } = useTranslation('content');
  const swaps = (suggestion?.options ?? []).filter((option): option is RescheduleSwapOption => option.kind === 'swap');
  const shift = (suggestion?.options ?? []).find((option): option is RescheduleShiftOption => option.kind === 'shift');
  const indoor = (suggestion?.options ?? []).find((option) => option.kind === 'indoor');
  const showPrompt = Boolean(suggestion && !promptDismissed && !applied);

  return (
    <div
      data-testid="rain-banner"
      className={clsx('rounded-xl border-l-2 p-3', verdict ? TONE_CLASSES[verdict.tone] : TONE_CLASSES.warning)}
    >
      {verdict ? (
        <>
          <p className="text-sm font-semibold">{verdict.title}</p>
          <p className="mt-0.5 text-caption text-text-secondary">
            {verdict.description}
            {candidate && !applied ? ` ${t('verdict.nearest', { date: formatDateShort(candidate.workout_date) })}` : ''}
          </p>
        </>
      ) : null}

      {applied ? (
        <p data-testid="reschedule-applied" role="status" className="mt-2 text-sm font-medium">
          {tContent('reschedule.applied')}
        </p>
      ) : showPrompt ? (
        <div data-testid="reschedule-prompt" className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-sm font-medium">{tContent('reschedule.prompt')}</p>
          {swaps.length > 0 ? (
            <ul className="space-y-2">
              {swaps.map((option, index) => (
                <li key={option.workoutId}>
                  <button
                    type="button"
                    data-testid={`reschedule-option-${index}`}
                    disabled={swapPending}
                    onClick={() => onApplyOption(option)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-elevated disabled:pointer-events-none disabled:opacity-60"
                  >
                    <span className="block text-sm font-semibold">{formatDateShort(option.date)}</span>
                    <span className="num block text-caption text-text-secondary">
                      {tContent(option.text.key, option.text.params)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {shift ? (
            <p data-testid="reschedule-shift" className="text-caption text-text-secondary">
              {tContent(shift.text.key, shift.text.params)}
            </p>
          ) : null}
          {indoor ? (
            <p data-testid="reschedule-indoor" className="text-caption text-text-secondary">
              {tContent(indoor.text.key, indoor.text.params)}
            </p>
          ) : null}
          <AppButton type="button" size="sm" variant="ghost" data-testid="reschedule-dismiss" onClick={onDismissPrompt}>
            {tContent('reschedule.dismiss')}
          </AppButton>
        </div>
      ) : null}

      {!applied ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {candidate ? (
            <AppButton type="button" size="sm" loading={swapPending} data-testid="swap-button" onClick={onLegacySwap}>
              {t('verdict.swap', { date: formatDateShort(candidate.workout_date) })}
            </AppButton>
          ) : null}
          <AppButton type="button" size="sm" variant="ghost" onClick={onLegacyStay}>
            {t('verdict.stay')}
          </AppButton>
        </div>
      ) : null}
      {swapError ? (
        <p role="alert" className="mt-2 text-caption text-danger-ink">
          {swapError}
        </p>
      ) : null}
    </div>
  );
}
