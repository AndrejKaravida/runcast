import { useMemo, useState } from 'react';
import {
  formatDuration,
  formatPace,
  pacesFromVdot,
  parseTimeToSeconds,
  predictRaceTimes,
  vdotFromPerformance,
  type RunWindow,
  type VolumeBand,
} from '@runcast/shared';
import { clsx } from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatRow } from '@/components/ui/StatRow';
import { CityPicker } from '@/components/forms/CityPicker';
import { useGeneratePlan, type GeneratePlanInput } from '@/features/plans/queries';
import { useUpdateProfile } from '@/features/profile/queries';
import { dayDiff, todayIso } from '@/lib/dates';

const DAY_LABELS = ['Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota', 'Nedelja'];
const DAY_SHORT = ['pon', 'uto', 'sre', 'čet', 'pet', 'sub', 'ned'];

const DISTANCE_OPTIONS = [
  { value: '42.195', label: 'Maraton' },
  { value: '21.0975', label: 'Polumaraton' },
  { value: '10', label: '10 km' },
  { value: '5', label: '5 km' },
];

const VOLUME_OPTIONS = [
  { value: 'lt20', label: 'do 20 km' },
  { value: '20-40', label: '20–40 km' },
  { value: '40-60', label: '40–60 km' },
  { value: 'gt60', label: 'preko 60 km' },
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

function tryParseTime(value: string): number | null {
  try {
    return parseTimeToSeconds(value.trim());
  } catch {
    return null;
  }
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const generatePlan = useGeneratePlan();
  const updateProfile = useUpdateProfile();

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  const goalTimeSec = useMemo(() => {
    const match = /^\d{1,2}:\d{2}:\d{2}$/.test(state.goalTime.trim());
    return match ? tryParseTime(state.goalTime) : null;
  }, [state.goalTime]);

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
            const [predicted] = predictRaceTimes(vdot, [goalPair.distanceKm]);
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
      if (!state.raceDate) {
        setError('Izaberi datum trke');
        return false;
      }
      if (state.raceDate <= todayIso()) {
        setError('Datum trke mora biti u budućnosti');
        return false;
      }
    }
    if (step === 1) {
      if (state.goalTime.trim() && (!/^\d{1,2}:\d{2}:\d{2}$/.test(state.goalTime.trim()) || !goalTimeSec)) {
        setError('Ciljno vreme unesi kao h:mm:ss (npr. 3:45:00)');
        return false;
      }
      if (state.recentDistanceKm && !state.recentTime.trim()) {
        setError('Unesi vreme poslednje trke');
        return false;
      }
      if (state.recentTime.trim() && !recentTimeSec) {
        setError('Vreme trke unesi kao mm:ss (npr. 25:30)');
        return false;
      }
      if (state.recentTime.trim() && !state.recentDistanceKm) {
        setError('Izaberi distancu poslednje trke');
        return false;
      }
    }
    if (step === 4 && (state.lat === null || state.lon === null)) {
      setError('Izaberi grad iz rezultata pretrage');
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
    const recentRace =
      state.recentTime.trim() && state.recentDistanceKm
        ? { distanceKm: Number(state.recentDistanceKm), timeSec: recentTimeSec as number }
        : null;
    const input: GeneratePlanInput = {
      race: state.hasRace
        ? {
            name: state.raceName.trim() || null,
            raceDate: state.raceDate,
            distanceKm: Number(state.distanceKm),
            goalTimeSec,
          }
        : null,
      recentRace,
      daysPerWeek: state.daysPerWeek,
      longRunDay: state.longRunDay,
      experience: state.experience,
      volumeBand: state.volumeBand,
    };
    try {
      await generatePlan.mutateAsync(input);
      await updateProfile.mutateAsync({
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
      });
      navigate('/today', { replace: true });
    } catch {
      setError('Generisanje plana nije uspelo — pokušaj ponovo');
    }
  }

  const weeksToRace = state.hasRace && state.raceDate ? dayDiff(todayIso(), state.raceDate) : null;
  const willUseBasePlan =
    !state.hasRace || (goalTimeSec === null && recentTimeSec === null) || (weeksToRace !== null && weeksToRace < 84);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-6">
      <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between text-caption text-text-muted">
          <span className="num">Korak {step + 1} / 6</span>
          <span>Podešavamo plan za tebe</span>
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
            <h1 className="text-2xl font-semibold tracking-display">Za koju trku se spremaš?</h1>
            <SegmentedControl
              value={state.hasRace ? 'yes' : 'no'}
              onChange={(value) => update('hasRace', value === 'yes')}
              options={[
                { value: 'yes', label: 'Imam trku' },
                { value: 'no', label: 'Još nemam' },
              ]}
            />
            {state.hasRace ? (
              <>
                <AppInput
                  label="Naziv trke (opciono)"
                  placeholder="Beogradski maraton"
                  value={state.raceName}
                  onChange={(event) => update('raceName', event.target.value)}
                />
                <AppInput
                  label="Datum trke"
                  type="date"
                  value={state.raceDate}
                  onChange={(event) => update('raceDate', event.target.value)}
                />
                <AppSelect
                  label="Distanca"
                  value={state.distanceKm}
                  onChange={(event) => update('distanceKm', event.target.value)}
                >
                  {DISTANCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AppSelect>
              </>
            ) : (
              <p className="text-sm text-text-secondary">
                Bez trke dobijaš bazni plan za narednih 8 nedelja — lagano trčanje bez ciljnih tempa. Trku možeš dodati
                kasnije u podešavanjima.
              </p>
            )}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-display">Čemu težiš?</h1>
            <AppInput
              label="Ciljno vreme (h:mm:ss, opciono)"
              placeholder="3:45:00"
              value={state.goalTime}
              onChange={(event) => update('goalTime', event.target.value)}
              hint="Npr. cilj za maraton u 3 sata i 45 minuta"
            />
            <div className="flex items-center gap-3 text-caption text-text-muted">
              <span className="h-px flex-1 bg-border" />
              ili
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AppSelect
                label="Poslednja trka"
                value={state.recentDistanceKm}
                onChange={(event) => update('recentDistanceKm', event.target.value)}
              >
                <option value="">—</option>
                <option value="21.0975">Polumaraton</option>
                <option value="10">10 km</option>
                <option value="5">5 km</option>
              </AppSelect>
              <AppInput
                label="Vreme (mm:ss)"
                placeholder="25:30"
                value={state.recentTime}
                onChange={(event) => update('recentTime', event.target.value)}
              />
            </div>
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
                      ? `Cilj je ambiciozan za trenutnu formu (predviđeno ${formatDuration(preview.feasibility.predictedSec)}).`
                      : `Cilj je realan za trenutnu formu (predviđeno ${formatDuration(preview.feasibility.predictedSec)}).`}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                Bez rezultata dobijaš bazni plan: lagano trčanje dok ne uhvatimo formu.
              </p>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-display">Iskustvo i trenutna kilometraža</h1>
            <div>
              <p className="section-label mb-1.5">Iskustvo</p>
              <SegmentedControl
                value={state.experience}
                onChange={(value) => update('experience', value)}
                options={[
                  { value: 'first', label: 'Prvi put' },
                  { value: 'experienced', label: 'Iskusan' },
                ]}
              />
            </div>
            <AppSelect
              label="Koliko kilometara prelaziš nedeljno?"
              value={state.volumeBand}
              onChange={(event) => update('volumeBand', event.target.value as VolumeBand)}
            >
              {VOLUME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AppSelect>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-display">Kada trčiš?</h1>
            <div>
              <p className="section-label mb-1.5">Koliko dana nedeljno</p>
              <SegmentedControl
                value={state.daysPerWeek}
                onChange={(value) => update('daysPerWeek', value)}
                options={[
                  { value: 3, label: '3' },
                  { value: 4, label: '4' },
                  { value: 5, label: '5' },
                  { value: 6, label: '6' },
                ]}
              />
            </div>
            <AppSelect
              label="Dan dugog trčanja"
              value={String(state.longRunDay)}
              onChange={(event) => update('longRunDay', Number(event.target.value))}
            >
              {DAY_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </AppSelect>
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_SHORT.map((label, index) => {
                  const isLong = index === state.longRunDay;
                  return (
                    <div
                      key={label}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 rounded-lg px-1 py-2',
                        isLong ? 'bg-rain-soft' : 'bg-surface-elevated',
                      )}
                    >
                      <span className={clsx('section-label', isLong && 'text-rain-ink')}>{label}</span>
                      <span className={clsx('h-1.5 w-1.5 rounded-full', isLong ? 'bg-rain-ink' : 'bg-text-muted')} />
                    </div>
                  );
                })}
              </div>
              <p className="text-caption text-text-muted">
                Dugi trk nosi nedelju — ostale dane raspoređujemo oko njega.
              </p>
            </div>
            <div>
              <p className="section-label mb-1.5">Deo dana za trening</p>
              <SegmentedControl
                value={state.runWindow}
                onChange={(value) => update('runWindow', value)}
                options={[
                  { value: 'morning', label: 'Jutro' },
                  { value: 'evening', label: 'Veče' },
                  { value: 'flexible', label: 'Fleksibilno' },
                ]}
              />
              <p className="mt-1.5 text-caption text-text-muted">Za jutro gledamo prognozu 06–09 h, za veče 17–21 h.</p>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-display">Gde trčiš?</h1>
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
              <p className="section-label mb-1.5">Osvežavanje prognoze</p>
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
                Samo na otvaranje
              </button>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-display">Još samo par detalja</h1>
            <div className="grid grid-cols-2 gap-3">
              <AppInput
                label="Visina (cm)"
                type="number"
                placeholder="182"
                value={state.heightCm}
                onChange={(event) => update('heightCm', event.target.value)}
              />
              <AppInput
                label="Težina (kg)"
                type="number"
                placeholder="78"
                value={state.weightKg}
                onChange={(event) => update('weightKg', event.target.value)}
              />
              <AppInput
                label="Godina rođenja"
                type="number"
                placeholder="1993"
                value={state.birthYear}
                onChange={(event) => update('birthYear', event.target.value)}
              />
              <AppSelect
                label="Pol"
                value={state.sex}
                onChange={(event) => update('sex', event.target.value as WizardState['sex'])}
              >
                <option value="">—</option>
                <option value="male">Muški</option>
                <option value="female">Ženski</option>
                <option value="other">Drugo</option>
              </AppSelect>
            </div>
            <div className="space-y-2 rounded-2xl bg-surface-elevated p-4">
              {state.hasRace && state.raceDate && weeksToRace !== null && weeksToRace >= 0 ? (
                <div>
                  <p className="section-label">Trka</p>
                  <p className="text-sm font-medium">{state.raceName || 'Trka bez naziva'}</p>
                  <p className="flex items-baseline gap-2">
                    <span className="num text-hero font-bold text-primary-ink">{weeksToRace}</span>
                    <span className="text-sm text-text-secondary">dana do trke</span>
                  </p>
                </div>
              ) : (
                <div>
                  <p className="section-label">Plan</p>
                  <p className="text-sm font-medium">Bazni plan · 8 nedelja</p>
                </div>
              )}
              <p className="num text-caption text-text-muted">
                {weeksToRace !== null && weeksToRace >= 0 ? `${Math.ceil(weeksToRace / 7)} nedelja · ` : ''}
                {state.daysPerWeek} dana nedeljno · dugi trk {DAY_LABELS[state.longRunDay]}
                {preview ? ` · VDOT ${preview.vdot}` : ''}
                {state.city ? ` · ${state.city}` : ''}
              </p>
            </div>
            {willUseBasePlan ? (
              <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-caption text-warning-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Bez cilja ili rezultata (ili manje od 12 nedelja do trke) dobijaš bazni plan — samo lagani treninzi.
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
            Nazad
          </AppButton>
        ) : null}
        {step < 5 ? (
          <AppButton type="button" onClick={next} className="flex-1">
            Dalje
          </AppButton>
        ) : (
          <AppButton
            type="button"
            onClick={() => void handleGenerate()}
            loading={generatePlan.isPending || updateProfile.isPending}
            className="flex-1"
          >
            Generiši plan
          </AppButton>
        )}
      </div>
    </div>
  );
}
