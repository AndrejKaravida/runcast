import { useState } from 'react';
import { formatDuration, type PlanPaces, type RunWindow, type VolumeBand } from '@runcast/shared';
import { Download, LogOut, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { CityPicker } from '@/components/forms/CityPicker';
import { PlanFields } from '@/components/forms/PlanFields';
import { useExportPlanIcs } from '@/features/plans/export';
import { useActivePlan, useGeneratePlan, type GeneratePlanInput } from '@/features/plans/queries';
import { useProfile, useUpdateProfile } from '@/features/profile/queries';
import { useAuth } from '@/auth/AuthProvider';
import { setLanguage, type AppLanguage } from '@/i18n';
import { dayDiff, formatDateShort, todayIso } from '@/lib/dates';
import { authErrorMessage } from '@/lib/auth-errors';
import { buildPlanInput, validatePlanDraft, type PlanDraft } from '@/lib/plan-form';
import type { ProfilesRow } from '@/types';

const REFRESH_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
  { value: 180, label: '3 h' },
  { value: 360, label: '6 h' },
  { value: 720, label: '12 h' },
];

interface ProfileForm {
  displayName: string;
  city: string;
  lat: number | null;
  lon: number | null;
  heightCm: string;
  weightKg: string;
  birthYear: string;
  sex: 'male' | 'female' | 'other' | '';
  runWindow: RunWindow;
  weatherRefreshMinutes: number | null;
  publicProfile: boolean;
}

function profileFormFrom(profile: ProfilesRow): ProfileForm {
  return {
    displayName: profile.display_name ?? '',
    city: profile.city ?? '',
    lat: profile.lat,
    lon: profile.lon,
    heightCm: profile.height_cm ? String(profile.height_cm) : '',
    weightKg: profile.weight_kg ? String(profile.weight_kg) : '',
    birthYear: profile.birth_year ? String(profile.birth_year) : '',
    sex: (profile.sex as ProfileForm['sex']) ?? '',
    runWindow: profile.run_window as RunWindow,
    weatherRefreshMinutes: profile.weather_refresh_minutes,
    publicProfile: profile.public_profile,
  };
}

export function SettingsPage() {
  const { session, signOut } = useAuth();
  const { t, i18n } = useTranslation('settings');
  const { data: profile } = useProfile();
  const { data: plan } = useActivePlan();
  const updateProfile = useUpdateProfile();
  const generatePlan = useGeneratePlan();
  const exportPlan = useExportPlanIcs();

  const language: AppLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'sr';

  const [profileForm, setProfileForm] = useState<ProfileForm | null>(null);
  const [planForm, setPlanForm] = useState<PlanDraft | null>(null);
  const [pendingInput, setPendingInput] = useState<GeneratePlanInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fuelingOn, setFuelingOn] = useState(() => localStorage.getItem('runcast.fueling') !== 'off');

  const form = profileForm ?? (profile ? profileFormFrom(profile) : null);

  async function handleSaveProfile() {
    if (!form) return;
    setError(null);
    setNotice(null);
    try {
      await updateProfile.mutateAsync({
        display_name: form.displayName.trim() || null,
        city: form.city || null,
        lat: form.lat,
        lon: form.lon,
        height_cm: form.heightCm ? Number(form.heightCm) : null,
        weight_kg: form.weightKg ? Number(form.weightKg) : null,
        birth_year: form.birthYear ? Number(form.birthYear) : null,
        sex: form.sex === '' ? null : form.sex,
        run_window: form.runWindow,
        weather_refresh_minutes: form.weatherRefreshMinutes,
        public_profile: form.publicProfile,
      });
      setProfileForm(null);
      setNotice(t('profile.saved'));
    } catch (caught) {
      setError(caught instanceof Error ? t(authErrorMessage(caught.message)) : t('errors.saveFailed'));
    }
  }

  function buildPlanForm(): PlanDraft {
    const race = plan?.races ?? null;
    return {
      raceDate: race?.race_date ?? plan?.race_date ?? '',
      distanceKm: race ? String(race.distance_km) : '42.195',
      goalTime: race?.goal_time_sec ? formatDuration(race.goal_time_sec) : '',
      recentDistanceKm: '',
      recentTime: '',
      daysPerWeek: (plan?.days_per_week as 3 | 4 | 5 | 6) ?? 4,
      longRunDay: plan?.long_run_day ?? 6,
      experience: profile?.experience === 'experienced' ? 'experienced' : 'first',
    };
  }

  function collectPlanInput(): GeneratePlanInput | null {
    if (!planForm) return null;
    setError(null);
    setNotice(null);
    const draftError = validatePlanDraft(planForm, ['raceDate', 'goalTime', 'recentRace'], todayIso());
    if (draftError) {
      setError(t(`errors.${draftError}`));
      return null;
    }
    return buildPlanInput(planForm, {
      hasRace: true,
      volumeBand: (profile?.volume_band as VolumeBand | null) ?? '20-40',
    });
  }

  async function runGenerate(input: GeneratePlanInput) {
    try {
      await generatePlan.mutateAsync(input);
      setPlanForm(null);
      setNotice(t('plan.generated'));
    } catch {
      setError(t('plan.generateFailed'));
    }
  }

  function handleGenerateClick() {
    const input = collectPlanInput();
    if (!input) return;
    const usesBasePlan = !input.recentRace && !input.race?.goalTimeSec;
    if (usesBasePlan) {
      setPendingInput(input);
      return;
    }
    void runGenerate(input);
  }

  async function handleExportPlan() {
    if (!plan) return;
    setError(null);
    setNotice(null);
    try {
      await exportPlan.mutateAsync({
        planId: plan.id,
        runWindow: (profile?.run_window as RunWindow | undefined) ?? 'morning',
        paces: (plan.paces ?? null) as unknown as PlanPaces | null,
      });
      setNotice(t('plan.exported'));
    } catch {
      setError(t('plan.exportFailed'));
    }
  }

  const daysToRace = plan ? dayDiff(todayIso(), plan.race_date) : null;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <SectionHeader label={t('language.label')} />
        <AppCard>
          <SegmentedControl
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'sr', label: t('language.sr') },
              { value: 'en', label: t('language.en') },
            ]}
          />
        </AppCard>
      </section>

      <section className="space-y-2">
        <SectionHeader label={t('appearance.label')} />
        <AppCard>
          <ThemeToggle />
        </AppCard>
      </section>

      {form ? (
        <section className="space-y-2">
          <SectionHeader label={t('profile.label')} />
          <AppCard className="space-y-4">
            <AvatarUpload
              avatarUrl={profile?.avatar_url ?? null}
              displayName={form.displayName.trim() || profile?.display_name || null}
            />
            <AppInput
              label={t('profile.name')}
              value={form.displayName}
              onChange={(event) => setProfileForm({ ...form, displayName: event.target.value })}
            />
            <div data-testid="public-profile">
              <p className="section-label mb-1.5">{t('profile.publicProfile')}</p>
              <SegmentedControl
                value={form.publicProfile ? 'on' : 'off'}
                onChange={(value) => setProfileForm({ ...form, publicProfile: value === 'on' })}
                options={[
                  { value: 'on', label: t('profile.publicProfilePublic') },
                  { value: 'off', label: t('profile.publicProfilePrivate') },
                ]}
              />
              <p className="mt-2 text-caption text-text-muted">{t('profile.publicProfileHint')}</p>
              <Link to="/leaderboard" className="mt-2 inline-flex text-caption font-medium text-primary-ink">
                {t('profile.openLeaderboard')}
              </Link>
            </div>
            <CityPicker
              city={form.city}
              onSelect={(place) => setProfileForm({ ...form, city: place.name, lat: place.lat, lon: place.lon })}
              onManualInput={() => {
                if (form.lat !== null || form.lon !== null) setProfileForm({ ...form, lat: null, lon: null });
              }}
            />
            <div className="grid grid-cols-3 gap-3">
              <AppInput
                label={t('profile.height')}
                type="number"
                value={form.heightCm}
                onChange={(event) => setProfileForm({ ...form, heightCm: event.target.value })}
              />
              <AppInput
                label={t('profile.weight')}
                type="number"
                value={form.weightKg}
                onChange={(event) => setProfileForm({ ...form, weightKg: event.target.value })}
              />
              <AppInput
                label={t('profile.birthYear')}
                type="number"
                value={form.birthYear}
                onChange={(event) => setProfileForm({ ...form, birthYear: event.target.value })}
              />
            </div>
            <AppSelect
              label={t('profile.sex')}
              value={form.sex}
              onChange={(event) => setProfileForm({ ...form, sex: event.target.value as ProfileForm['sex'] })}
            >
              <option value="">—</option>
              <option value="male">{t('profile.sexMale')}</option>
              <option value="female">{t('profile.sexFemale')}</option>
              <option value="other">{t('profile.sexOther')}</option>
            </AppSelect>
            <div>
              <p className="section-label mb-1.5">{t('training.runWindow')}</p>
              <SegmentedControl
                value={form.runWindow}
                onChange={(runWindow) => setProfileForm({ ...form, runWindow })}
                options={[
                  { value: 'morning', label: t('training.runWindowMorning') },
                  { value: 'evening', label: t('training.runWindowEvening') },
                  { value: 'flexible', label: t('training.runWindowFlexible') },
                ]}
              />
            </div>
            <div>
              <p className="section-label mb-1.5">{t('training.fueling')}</p>
              <SegmentedControl
                value={fuelingOn ? 'on' : 'off'}
                onChange={(value) => {
                  setFuelingOn(value === 'on');
                  localStorage.setItem('runcast.fueling', value);
                }}
                options={[
                  { value: 'on', label: t('training.fuelingOn') },
                  { value: 'off', label: t('training.fuelingOff') },
                ]}
              />
            </div>
            <div>
              <p className="section-label mb-1.5">{t('training.weatherRefresh')}</p>
              <SegmentedControl
                value={form.weatherRefreshMinutes}
                onChange={(weatherRefreshMinutes) => setProfileForm({ ...form, weatherRefreshMinutes })}
                options={REFRESH_OPTIONS}
              />
              <button
                type="button"
                onClick={() => setProfileForm({ ...form, weatherRefreshMinutes: null })}
                className={`mt-2 rounded-lg px-3 py-1.5 text-caption font-medium ${
                  form.weatherRefreshMinutes === null
                    ? 'bg-rain-soft text-rain-ink'
                    : 'bg-surface-elevated text-text-muted hover:text-text-secondary'
                }`}
              >
                {t('training.onOpen')}
              </button>
            </div>
            <AppButton onClick={() => void handleSaveProfile()} loading={updateProfile.isPending}>
              {t('training.saveProfile')}
            </AppButton>
          </AppCard>
        </section>
      ) : null}

      <section className="space-y-2">
        <SectionHeader
          label={t('plan.label')}
          action={plan ? <AppBadge tone="primary">{t('plan.weeks', { weeks: plan.weeks })}</AppBadge> : null}
        />
        {plan ? (
          <AppCard className="space-y-2 border-primary/40 bg-gradient-to-b from-primary-soft to-transparent">
            <p className="section-label">{t('plan.goalRace')}</p>
            <p className="text-sm font-medium">{plan.races?.name ?? t('plan.raceFallback')}</p>
            {daysToRace !== null && daysToRace >= 0 ? (
              <p className="flex items-baseline gap-2">
                <span className="num text-hero font-bold text-primary-ink">{daysToRace}</span>
                <span className="text-sm text-text-secondary">{t('plan.daysToRace')}</span>
              </p>
            ) : null}
            <p className="num text-caption text-text-muted">
              {t('plan.meta', { date: formatDateShort(plan.race_date), days: plan.days_per_week })}
            </p>
            <div className="rounded-xl bg-surface-elevated p-3">
              <p className="text-sm text-text-secondary">{t('plan.benchmarkHint')}</p>
              <Link
                to="/benchmark"
                className="mt-1 inline-block text-sm font-medium text-primary-ink hover:text-primary-ink-hover"
              >
                {t('plan.benchmarkCta')}
              </Link>
            </div>
            <AppButton
              variant="secondary"
              className="w-full"
              loading={exportPlan.isPending}
              onClick={() => void handleExportPlan()}
            >
              <Download className="h-4 w-4" aria-hidden /> {t('plan.export')}
            </AppButton>
          </AppCard>
        ) : (
          <AppCard>
            <p className="text-sm text-text-muted">{t('plan.noPlan')}</p>
          </AppCard>
        )}
        {planForm ? (
          <AppCard className="space-y-3">
            <p className="text-sm font-medium">{t('plan.newPlan')}</p>
            <PlanFields
              variant="settings"
              groups={['race', 'goal', 'schedule', 'experience']}
              value={planForm}
              onChange={(patch) => setPlanForm({ ...planForm, ...patch })}
            />
            <div className="flex gap-3">
              <AppButton variant="secondary" className="flex-1" onClick={() => setPlanForm(null)}>
                {t('cancel')}
              </AppButton>
              <AppButton className="flex-1" loading={generatePlan.isPending} onClick={() => handleGenerateClick()}>
                <RefreshCw className="h-4 w-4" aria-hidden /> {t('plan.generate')}
              </AppButton>
            </div>
          </AppCard>
        ) : (
          <AppButton variant="secondary" className="w-full" onClick={() => setPlanForm(buildPlanForm())}>
            <RefreshCw className="h-4 w-4" aria-hidden /> {t('plan.generateNew')}
          </AppButton>
        )}
      </section>

      <section className="space-y-2">
        <SectionHeader label={t('account.label')} />
        <AppCard className="space-y-2">
          <p className="break-all text-caption text-text-muted">{session?.user.email}</p>
          <AppButton
            variant="danger"
            size="sm"
            className="self-start"
            onClick={() => {
              void signOut();
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden /> {t('account.signOut')}
          </AppButton>
        </AppCard>
      </section>

      {notice ? (
        <p className="rounded-xl border border-success/40 bg-success-soft px-3 py-2 text-sm text-success-ink">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink">{error}</p>
      ) : null}

      <ConfirmDialog
        open={pendingInput !== null}
        title={t('plan.baseConfirmTitle')}
        description={t('plan.baseConfirmText')}
        confirmLabel={t('plan.baseConfirmAction')}
        loading={generatePlan.isPending}
        onConfirm={() => {
          const input = pendingInput;
          setPendingInput(null);
          if (input) void runGenerate(input);
        }}
        onClose={() => setPendingInput(null)}
      />
    </div>
  );
}
