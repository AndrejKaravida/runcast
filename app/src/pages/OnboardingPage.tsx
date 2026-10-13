import { useMemo, useState } from 'react';
import {
  formatDuration,
  formatPace,
  pacesFromVdot,
  predictRaceTimes,
  vdotFromPerformance,
  type RunWindow,
  type VolumeBand,
} from '@runcast/shared';
import { clsx } from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatRow } from '@/components/ui/StatRow';
import { CityPicker } from '@/components/forms/CityPicker';
import { PlanFields } from '@/components/forms/PlanFields';
import { useGeneratePlan } from '@/features/plans/queries';
import { useUpdateProfile } from '@/features/profile/queries';
import { dayDiff, todayIso } from '@/lib/dates';
import { buildPlanInput, parseOptionalTime, tryParseTime, validatePlanDraft, type PlanDraft } from '@/lib/plan-form';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const VOLUME_OPTIONS = [
  { value: 'lt20', labelKey: 'volume.lt20' },
  { value: '20-40', labelKey: 'volume.from20to40' },
  { value: '40-60', labelKey: 'volume.from40to60' },
  { value: 'gt60', labelKey: 'volume.over60' },
];

const REFRESH_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
  { value: 180, label: '3 h' },
  { value: 360, label: '6 h' },
  { value: 720, label: '12 h' },
];

interface WizardState {
  hasRace: boolean;
  raceName: string;
  raceDate: string;
  distanceKm: string;
  goalTime: string;
  recentDistanceKm: string;
  recentTime: string;
  experience: 'first' | 'experienced';
  volumeBand: VolumeBand;
  daysPerWeek: 3 | 4 | 5 | 6;
  longRunDay: number;
  runWindow: RunWindow;
  weatherRefreshMinutes: number | null;
  city: string;
  lat: number | null;
  lon: number | null;
  heightCm: string;
  weightKg: string;
  birthYear: string;
  sex: 'male' | 'female' | 'other' | '';
}

const initialState: WizardState = {
  hasRace: true,
  raceName: '',
  raceDate: '',
  distanceKm: '42.195',
  goalTime: '',
  recentDistanceKm: '',
  recentTime: '',
  experience: 'first',
  volumeBand: '20-40',
  daysPerWeek: 4,
  longRunDay: 6,
  runWindow: 'morning',
  weatherRefreshMinutes: 60,
  city: '',
  lat: null,
  lon: null,
  heightCm: '',
  weightKg: '',
  birthYear: '',
  sex: '',
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('onboarding');
  const generatePlan = useGeneratePlan();
  const updateProfile = useUpdateProfile();

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function updatePlan(patch: Partial<PlanDraft>) {
    setState((current) => ({ ...current, ...patch }));
    setError(null);
  }

  const goalTimeSec = useMemo(() => parseOptionalTime(state.goalTime), [state.goalTime]);

  const recentTimeSec = state.recentTime.trim() ? tryParseTime(state.recentTime) : null;

  const preview = useMemo(() => {
    const recentPair =
      state.recentDistanceKm && recentTimeSec
        ? { distanceKm: Number(state.recentDistanceKm), timeSec: recentTimeSec }
        : null;
    const goalPair = goalTimeSec !== null ? { distanceKm: Number(state.distanceKm), timeSec: goalTimeSec } : null;
    const anchor = recentPair ?? goalPair;
    if (!anchor) return null;
    const vdot = vdotFromPerformance(anchor.distanceKm, anchor.timeSec);
    const paces = pacesFromVdot(vdot);
    const feasibility =
      recentPair && goalPair
        ? (() => {
            const predicted = predictRaceTimes(vdot, [goalPair.distanceKm])?.[0];
            if (!predicted) return null;
            return {
              predictedSec: predicted.timeSec,
              ambitious: (goalPair.timeSec - predicted.timeSec) / predicted.timeSec < -0.03,
            };
          })()
        : null;
    return { vdot: Math.round(vdot * 10) / 10, paces, feasibility };
  }, [goalTimeSec, recentTimeSec, state.recentDistanceKm, state.distanceKm]);

  function validateStep(): boolean {
    if (step === 0 && state.hasRace) {
      const draftError = validatePlanDraft(state, ['raceDate'], todayIso());
      if (draftError) {
        setError(t(`errors.${draftError}`));
        return false;
      }
    }
    if (step === 1) {
      const draftError = validatePlanDraft(state, ['goalTime', 'recentRace'], todayIso());
      if (draftError) {
        setError(t(`errors.${draftError}`));
        return false;
      }
    }
    if (step === 4 && (state.lat === null || state.lon === null)) {
      setError(t('errors.cityRequired'));
      return false;
    }
    return true;
  }

  function next() {
    if (!validateStep()) return;
    setStep((current) => Math.min(current + 1, 5));
  }

  function back() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleGenerate() {
    setError(null);
    const input = buildPlanInput(state, {
      hasRace: state.hasRace,
      raceName: state.raceName,
      volumeBand: state.volumeBand,
    });
    try {
      await generatePlan.mutateAsync(input);
    } catch {
      setError(t('errors.generateFailed'));
      return;
    }
    await updateProfile
      .mutateAsync({
        onboarding_completed: true,
        city: state.city,
        lat: state.lat,
        lon: state.lon,
        run_window: state.runWindow,
        weather_refresh_minutes: state.weatherRefreshMinutes,
        experience: state.experience,
        volume_band: state.volumeBand,
        height_cm: state.heightCm ? Number(state.heightCm) : null,
        weight_kg: state.weightKg ? Number(state.weightKg) : null,
        birth_year: state.birthYear ? Number(state.birthYear) : null,
        sex: state.sex === '' ? null : state.sex,
      })
      .catch(() => undefined);
    navigate('/today', { replace: true });
  }

  const weeksToRace = state.hasRace && state.raceDate ? dayDiff(todayIso(), state.raceDate) : null;
  const willUseBasePlan =
    !state.hasRace || (goalTimeSec === null && recentTimeSec === null) || (weeksToRace !== null && weeksToRace < 84);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-6">
      <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between text-caption text-text-muted">
          <span className="num">{t('header.step', { step: step + 1 })}</span>
          <span>{t('header.tagline')}</span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: 6 }).map((_, index) => (
            <span
              key={index}
              className={clsx(
                'h-1 flex-1 rounded-full transition-colors',
                index <= step ? 'bg-primary-ink' : 'bg-surface-elevated',
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {step === 0 ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-display">{t('steps.race.title')}</h1>
            <SegmentedControl
              value={state.hasRace ? 'yes' : 'no'}
              onChange={(value) => update('hasRace', value === 'yes')}
              options={[
                { value: 'yes', label: t('steps.race.hasRace') },
                { value: 'no', label: t('steps.race.noRace') },
              ]}
            />
            {state.hasRace ? (
              <>
                <AppInput
                  label={t('fields.raceName')}
                  placeholder={t('fields.raceNamePlaceholder')}
                  value={state.raceName}
                  onChange={(event) => update('raceName', event.target.value)}
                />
                <PlanFields variant="onboarding" groups={['race']} value={state} onChange={updatePlan} />
              </>
            ) : (
              <p className="text-sm text-text-secondary">{t('steps.race.noRaceText')}</p>
            )}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-display">{t('steps.goal.title')}</h1>
            <PlanFields variant="onboarding" groups={['goal']} value={state} onChange={updatePlan} />
            {preview ? (
              <div className="space-y-3 rounded-2xl bg-primary-soft p-4">
                <p className="flex items-baseline gap-2">
                  <span className="section-label">VDOT</span>{' '}
                  <span className="num value-swap text-hero font-bold text-primary-ink">{preview.vdot}</span>
                </p>
                <StatRow
                  items={[
                    {
                      label: 'Easy',
                      value: `${formatPace(preview.paces.easySlowSecPerKm)}–${formatPace(preview.paces.easyFastSecPerKm)} /km`,
                    },
                    { label: 'Tempo', value: `${formatPace(preview.paces.thresholdSecPerKm)} /km` },
                  ]}
                  className="rounded-xl bg-surface py-1"
                />
                {preview.feasibility ? (
                  <p className="text-sm text-text-secondary">
                    {preview.feasibility.ambitious
                      ? t('steps.goal.ambitious', { time: formatDuration(preview.feasibility.predictedSec) })
                      : t('steps.goal.realistic', { time: formatDuration(preview.feasibility.predictedSec) })}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-text-muted">{t('steps.goal.noResult')}</p>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-display">{t('steps.experience.title')}</h1>
            <PlanFields variant="onboarding" groups={['experience']} value={state} onChange={updatePlan} />
            <AppSelect
              label={t('steps.experience.volume')}
              value={state.volumeBand}
              onChange={(event) => update('volumeBand', event.target.value as VolumeBand)}
            >
              {VOLUME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </AppSelect>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-display">{t('steps.schedule.title')}</h1>
            <PlanFields variant="onboarding" groups={['schedule']} value={state} onChange={updatePlan} />
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_KEYS.map((key, index) => {
                  const isLong = index === state.longRunDay;
                  return (
                    <div
                      key={key}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 rounded-lg px-1 py-2',
                        isLong ? 'bg-rain-soft' : 'bg-surface-elevated',
                      )}
                    >
                      <span className={clsx('section-label', isLong && 'text-rain-ink')}>{t(`days.short.${key}`)}</span>
                      <span className={clsx('h-1.5 w-1.5 rounded-full', isLong ? 'bg-rain-ink' : 'bg-text-muted')} />
                    </div>
                  );
                })}
              </div>
              <p className="text-caption text-text-muted">{t('steps.schedule.longRunNote')}</p>
            </div>
            <div>
              <p className="section-label mb-1.5">{t('fields.runWindow')}</p>
              <SegmentedControl
                value={state.runWindow}
                onChange={(value) => update('runWindow', value)}
                options={[
                  { value: 'morning', label: t('window.morning') },
                  { value: 'evening', label: t('window.evening') },
                  { value: 'flexible', label: t('window.flexible') },
                ]}
              />
              <p className="mt-1.5 text-caption text-text-muted">{t('steps.schedule.windowNote')}</p>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-display">{t('steps.location.title')}</h1>
            <CityPicker
              city={state.city}
              onSelect={(place) => {
                update('city', place.name);
                update('lat', place.lat);
                update('lon', place.lon);
              }}
              onManualInput={() => {
                if (state.lat !== null || state.lon !== null) {
                  update('lat', null);
                  update('lon', null);
                }
              }}
            />
            <div>
              <p className="section-label mb-1.5">{t('fields.weatherRefresh')}</p>
              <SegmentedControl
                value={state.weatherRefreshMinutes}
                onChange={(value) => update('weatherRefreshMinutes', value)}
                options={REFRESH_OPTIONS}
              />
              <button
                type="button"
                onClick={() => update('weatherRefreshMinutes', null)}
                className={clsx(
                  'mt-2 rounded-lg px-3 py-1.5 text-caption font-medium',
                  state.weatherRefreshMinutes === null
                    ? 'bg-rain-soft text-rain-ink'
                    : 'bg-surface-elevated text-text-muted hover:text-text-secondary',
                )}
              >
                {t('onOpen')}
              </button>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-display">{t('steps.details.title')}</h1>
            <div className="grid grid-cols-2 gap-3">
              <AppInput
                label={t('fields.height')}
                type="number"
                placeholder="182"
                value={state.heightCm}
                onChange={(event) => update('heightCm', event.target.value)}
              />
              <AppInput
                label={t('fields.weight')}
                type="number"
                placeholder="78"
                value={state.weightKg}
                onChange={(event) => update('weightKg', event.target.value)}
              />
              <AppInput
                label={t('fields.birthYear')}
                type="number"
                placeholder="1993"
                value={state.birthYear}
                onChange={(event) => update('birthYear', event.target.value)}
              />
              <AppSelect
                label={t('fields.sex')}
                value={state.sex}
                onChange={(event) => update('sex', event.target.value as WizardState['sex'])}
              >
                <option value="">—</option>
                <option value="male">{t('sex.male')}</option>
                <option value="female">{t('sex.female')}</option>
                <option value="other">{t('sex.other')}</option>
              </AppSelect>
            </div>
            <div className="space-y-2 rounded-2xl bg-surface-elevated p-4">
              {state.hasRace && state.raceDate && weeksToRace !== null && weeksToRace >= 0 ? (
                <div>
                  <p className="section-label">{t('steps.details.race')}</p>
                  <p className="text-sm font-medium">{state.raceName || t('raceFallback')}</p>
                  <p className="flex items-baseline gap-2">
                    <span className="num text-hero font-bold text-primary-ink">{weeksToRace}</span>
                    <span className="text-sm text-text-secondary">{t('daysToRace')}</span>
                  </p>
                </div>
              ) : (
                <div>
                  <p className="section-label">{t('steps.details.plan')}</p>
                  <p className="text-sm font-medium">{t('steps.details.basePlan')}</p>
                </div>
              )}
              <p className="num text-caption text-text-muted">
                {weeksToRace !== null && weeksToRace >= 0
                  ? `${t('steps.details.summaryWeeks', { weeks: Math.ceil(weeksToRace / 7) })} · `
                  : ''}
                {t('steps.details.summaryDays', {
                  days: state.daysPerWeek,
                  day: t(`days.${DAY_KEYS[state.longRunDay]}`),
                })}
                {preview ? ` · VDOT ${preview.vdot}` : ''}
                {state.city ? ` · ${state.city}` : ''}
              </p>
            </div>
            {willUseBasePlan ? (
              <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-caption text-warning-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {t('steps.details.baseWarning')}
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink">{error}</p>
        ) : null}
      </div>

      <div className="mt-6 flex gap-3">
        {step > 0 ? (
          <AppButton type="button" variant="secondary" onClick={back} className="flex-1">
            {t('actions.back')}
          </AppButton>
        ) : null}
        {step < 5 ? (
          <AppButton type="button" onClick={next} className="flex-1">
            {t('actions.next')}
          </AppButton>
        ) : (
          <AppButton
            type="button"
            onClick={() => void handleGenerate()}
            loading={generatePlan.isPending || updateProfile.isPending}
            className="flex-1"
          >
            {t('actions.generate')}
          </AppButton>
        )}
      </div>
    </div>
  );
}
