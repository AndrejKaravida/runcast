import { useState } from 'react';
import { formatDuration, parseTimeToSeconds, type RunWindow, type VolumeBand } from '@runcast/shared';
import { LogOut, RefreshCw } from 'lucide-react';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CityPicker } from '@/components/forms/CityPicker';
import { useActivePlan, useGeneratePlan, type GeneratePlanInput } from '@/features/plans/queries';
import { useProfile, useUpdateProfile } from '@/features/profile/queries';
import { useAuth } from '@/auth/AuthProvider';
import { formatDateShort, todayIso } from '@/lib/dates';
import { authErrorMessage } from '@/lib/auth-errors';
import type { ProfilesRow } from '@/types';

const DAY_LABELS = ['Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota', 'Nedelja'];

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
}

interface PlanForm {
  raceDate: string;
  distanceKm: string;
  goalTime: string;
  recentDistanceKm: string;
  recentTime: string;
  daysPerWeek: 3 | 4 | 5 | 6;
  longRunDay: number;
  experience: 'first' | 'experienced';
  volumeBand: VolumeBand;
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
  };
}

function tryParseTime(value: string): number | null {
  try {
    return parseTimeToSeconds(value.trim());
  } catch {
    return null;
  }
}

export function SettingsPage() {
  const { session, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: plan } = useActivePlan();
  const updateProfile = useUpdateProfile();
  const generatePlan = useGeneratePlan();

  const [formOverride, setFormOverride] = useState<ProfileForm | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm | null>(null);
  const [pendingInput, setPendingInput] = useState<GeneratePlanInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = formOverride ?? (profile ? profileFormFrom(profile) : null);

  function setForm(next: ProfileForm) {
    setFormOverride(next);
  }

  function buildPlanForm(): PlanForm {
    const race = plan?.races ?? null;
    return {
      raceDate: race?.race_date ?? plan?.race_date ?? '',
      distanceKm: race ? String(race.distance_km) : '42.195',
      goalTime: race?.goal_time_sec ? formatDuration(race.goal_time_sec) : '',
      recentDistanceKm: '',
      recentTime: '',
      daysPerWeek: (plan?.days_per_week as 3 | 4 | 5 | 6) ?? 4,
      longRunDay: plan?.long_run_day ?? 6,
      experience: (profile?.experience as 'first' | 'experienced') ?? 'first',
      volumeBand: (profile?.volume_band as VolumeBand) ?? '20-40',
    };
  }

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
      });
      setNotice('Profil je sačuvan.');
    } catch (caught) {
      setError(caught instanceof Error ? authErrorMessage(caught.message) : 'Čuvanje nije uspelo');
    }
  }

  function buildPlanInput(): GeneratePlanInput | null {
    if (!planForm) return null;
    setError(null);
    setNotice(null);
    if (!planForm.raceDate) {
      setError('Izaberi datum trke ili ciljni datum');
      return null;
    }
    if (planForm.raceDate <= todayIso()) {
      setError('Datum mora biti u budućnosti');
      return null;
    }
    const goalTimeSec = planForm.goalTime.trim() ? tryParseTime(planForm.goalTime) : null;
    if (planForm.goalTime.trim() && !goalTimeSec) {
      setError('Ciljno vreme unesi kao h:mm:ss (npr. 3:45:00)');
      return null;
    }
    const recentTimeSec = planForm.recentTime.trim() ? tryParseTime(planForm.recentTime) : null;
    if (planForm.recentTime.trim() && (!recentTimeSec || !planForm.recentDistanceKm)) {
      setError('Za poslednju trku izaberi distancu i vreme kao mm:ss');
      return null;
    }
    return {
      race: { name: null, raceDate: planForm.raceDate, distanceKm: Number(planForm.distanceKm), goalTimeSec },
      recentRace:
        recentTimeSec && planForm.recentDistanceKm
          ? { distanceKm: Number(planForm.recentDistanceKm), timeSec: recentTimeSec }
          : null,
      daysPerWeek: planForm.daysPerWeek,
      longRunDay: planForm.longRunDay,
      experience: planForm.experience,
      volumeBand: planForm.volumeBand,
    };
  }

  async function runGenerate(input: GeneratePlanInput) {
    try {
      await generatePlan.mutateAsync(input);
      setPlanForm(null);
      setNotice('Novi plan je generisan, a stari zamenjen.');
    } catch {
      setError('Generisanje nije uspelo — pokušaj ponovo');
    }
  }

  function handleGenerateClick() {
    const input = buildPlanInput();
    if (!input) return;
    const usesBasePlan = !input.recentRace && !input.race?.goalTimeSec;
    if (usesBasePlan) {
      setPendingInput(input);
      return;
    }
    void runGenerate(input);
  }

  return (
    <div className="space-y-4">
      <AppCard className="space-y-2">
        <p className="text-sm font-semibold">Nalog</p>
        <p className="text-sm text-text-secondary">{session?.user.email}</p>
        <AppButton
          variant="ghost"
          size="sm"
          onClick={() => {
            void signOut();
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden /> Odjavi se
        </AppButton>
      </AppCard>

      {form ? (
        <AppCard className="space-y-4">
          <p className="text-sm font-semibold">Profil</p>
          <AppInput
            label="Ime"
            value={form.displayName}
            onChange={(event) => setForm({ ...form, displayName: event.target.value })}
          />
          <CityPicker
            city={form.city}
            onSelect={(place) => setForm({ ...form, city: place.name, lat: place.lat, lon: place.lon })}
            onManualInput={() => {
              if (form.lat !== null || form.lon !== null) setForm({ ...form, lat: null, lon: null });
            }}
          />
          <div className="grid grid-cols-3 gap-3">
            <AppInput
              label="Visina (cm)"
              type="number"
              value={form.heightCm}
              onChange={(event) => setForm({ ...form, heightCm: event.target.value })}
            />
            <AppInput
              label="Težina (kg)"
              type="number"
              value={form.weightKg}
              onChange={(event) => setForm({ ...form, weightKg: event.target.value })}
            />
            <AppInput
              label="Rođenje"
              type="number"
              value={form.birthYear}
              onChange={(event) => setForm({ ...form, birthYear: event.target.value })}
            />
          </div>
          <AppSelect
            label="Pol"
            value={form.sex}
            onChange={(event) => setForm({ ...form, sex: event.target.value as ProfileForm['sex'] })}
          >
            <option value="">—</option>
            <option value="male">Muški</option>
            <option value="female">Ženski</option>
            <option value="other">Drugo</option>
          </AppSelect>
          <div>
            <p className="mb-1.5 text-sm font-medium text-text-secondary">Deo dana za trening</p>
            <SegmentedControl
              value={form.runWindow}
              onChange={(value) => setForm({ ...form, runWindow: value })}
              options={[
                { value: 'morning', label: 'Jutro' },
                { value: 'evening', label: 'Veče' },
                { value: 'flexible', label: 'Fleksibilno' },
              ]}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-text-secondary">Osvežavanje prognoze</p>
            <SegmentedControl
              value={form.weatherRefreshMinutes}
              onChange={(value) => setForm({ ...form, weatherRefreshMinutes: value })}
              options={REFRESH_OPTIONS}
            />
            <button
              type="button"
              onClick={() => setForm({ ...form, weatherRefreshMinutes: null })}
              className={`mt-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
                form.weatherRefreshMinutes === null
                  ? 'bg-rain-soft text-rain'
                  : 'bg-surface-elevated text-text-muted hover:text-text-secondary'
              }`}
            >
              Samo na otvaranje
            </button>
          </div>
          <AppButton onClick={() => void handleSaveProfile()} loading={updateProfile.isPending}>
            Sačuvaj profil
          </AppButton>
        </AppCard>
      ) : null}

      <AppCard className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Plan</p>
          {plan ? <AppBadge tone="primary">{plan.weeks} nedelja</AppBadge> : null}
        </div>
        {plan ? (
          <p className="text-sm text-text-secondary">
            Cilj: {formatDateShort(plan.race_date)} · {plan.days_per_week} dana nedeljno · faze: baza → izgradnja → vrh
            → taper
          </p>
        ) : (
          <p className="text-sm text-text-muted">Nema aktivnog plana.</p>
        )}
        {planForm ? (
          <div className="space-y-3 rounded-xl border border-border bg-surface-elevated p-3">
            <p className="text-sm font-medium">Novi plan (stari se arhivira)</p>
            <AppInput
              label="Datum trke / ciljni datum"
              type="date"
              value={planForm.raceDate}
              onChange={(event) => setPlanForm({ ...planForm, raceDate: event.target.value })}
            />
            <AppSelect
              label="Distanca"
              value={planForm.distanceKm}
              onChange={(event) => setPlanForm({ ...planForm, distanceKm: event.target.value })}
            >
              <option value="42.195">Maraton</option>
              <option value="21.0975">Polumaraton</option>
              <option value="10">10 km</option>
              <option value="5">5 km</option>
            </AppSelect>
            <div className="grid grid-cols-2 gap-3">
              <AppInput
                label="Ciljno vreme (opciono)"
                placeholder="3:45:00"
                value={planForm.goalTime}
                onChange={(event) => setPlanForm({ ...planForm, goalTime: event.target.value })}
              />
              <AppInput
                label="Ref. distanca (km)"
                placeholder="10"
                value={planForm.recentDistanceKm}
                onChange={(event) => setPlanForm({ ...planForm, recentDistanceKm: event.target.value })}
              />
            </div>
            <AppInput
              label="Ref. vreme (mm:ss, opciono)"
              placeholder="50:30"
              value={planForm.recentTime}
              onChange={(event) => setPlanForm({ ...planForm, recentTime: event.target.value })}
            />
            <div>
              <p className="mb-1.5 text-sm font-medium text-text-secondary">Dani nedeljno</p>
              <SegmentedControl
                value={planForm.daysPerWeek}
                onChange={(value) => setPlanForm({ ...planForm, daysPerWeek: value })}
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
              value={String(planForm.longRunDay)}
              onChange={(event) => setPlanForm({ ...planForm, longRunDay: Number(event.target.value) })}
            >
              {DAY_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </AppSelect>
            <div>
              <p className="mb-1.5 text-sm font-medium text-text-secondary">Iskustvo</p>
              <SegmentedControl
                value={planForm.experience}
                onChange={(value) => setPlanForm({ ...planForm, experience: value })}
                options={[
                  { value: 'first', label: 'Prvi put' },
                  { value: 'experienced', label: 'Iskusan' },
                ]}
              />
            </div>
            <div className="flex gap-3">
              <AppButton variant="secondary" className="flex-1" onClick={() => setPlanForm(null)}>
                Otkaži
              </AppButton>
              <AppButton className="flex-1" loading={generatePlan.isPending} onClick={() => handleGenerateClick()}>
                <RefreshCw className="h-4 w-4" aria-hidden /> Generiši
              </AppButton>
            </div>
          </div>
        ) : (
          <AppButton variant="secondary" onClick={() => setPlanForm(buildPlanForm())}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Generiši novi plan
          </AppButton>
        )}
      </AppCard>

      {notice ? (
        <p className="rounded-xl border border-success/40 bg-success-soft px-3 py-2 text-sm text-success">{notice}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      <ConfirmDialog
        open={pendingInput !== null}
        title="Generisati bazni plan?"
        description="Bez ciljnog vremena ili rezultata trke, plan nema kvalitetne treninge ni ciljne tempe — dobijaš samo lagano trčanje. Nastaviti?"
        confirmLabel="Generiši bazni plan"
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
