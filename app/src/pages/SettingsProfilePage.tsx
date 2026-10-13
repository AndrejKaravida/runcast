import { useState } from 'react';
import type { RunWindow } from '@runcast/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { CityPicker } from '@/components/forms/CityPicker';
import { useProfile, useUpdateProfile } from '@/features/profile/queries';
import { authErrorMessage } from '@/lib/auth-errors';
import type { ProfilesRow } from '@/types';

const REFRESH_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
  { value: 180, label: '3 h' },
  { value: 360, label: '6 h' },
  { value: 720, label: '12 h' },
];

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const RESERVED_USERNAMES = ['runcast', 'admin', 'support', 'system'];

interface ProfileForm {
  displayName: string;
  username: string;
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
    username: profile.username ?? '',
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

function ProfileSkeleton() {
  return (
    <AppCard className="space-y-4" data-testid="profile-skeleton">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
          <Skeleton className="h-16 w-16" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-11" />
      <Skeleton className="h-11" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
      <Skeleton className="h-11" />
      <Skeleton className="h-11" />
      <Skeleton className="h-11" />
      <Skeleton className="h-11" />
      <Skeleton className="h-11" />
    </AppCard>
  );
}

export function SettingsProfilePage() {
  const { t } = useTranslation('settings');
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [profileForm, setProfileForm] = useState<ProfileForm | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fuelingOn, setFuelingOn] = useState(() => localStorage.getItem('runcast.fueling') !== 'off');

  const form = profileForm ?? (profile ? profileFormFrom(profile) : null);

  async function handleSaveProfile() {
    if (!form) return;
    setError(null);
    setNotice(null);
    const username = form.username.trim().toLowerCase();
    if (username.length > 0 && (username.length < 3 || username.length > 20)) {
      setError(t('profile.usernameLength'));
      return;
    }
    if (username.length > 0 && !USERNAME_PATTERN.test(username)) {
      setError(t('profile.usernameFormat'));
      return;
    }
    if (RESERVED_USERNAMES.includes(username)) {
      setError(t('profile.usernameReserved'));
      return;
    }
    try {
      await updateProfile.mutateAsync({
        display_name: form.displayName.trim() || null,
        username: username || null,
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
      if ((caught as { code?: string } | null)?.code === '23505') {
        setError(t('profile.usernameTaken'));
        return;
      }
      setError(caught instanceof Error ? t(authErrorMessage(caught.message)) : t('errors.saveFailed'));
    }
  }

  return (
    <SettingsSubpage title={t('profile.label')}>
      {form ? (
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
          <AppInput
            label={t('profile.username')}
            value={form.username}
            autoComplete="off"
            hint={t('profile.usernameHint')}
            onChange={(event) => setProfileForm({ ...form, username: event.target.value })}
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
      ) : profileLoading ? (
        <ProfileSkeleton />
      ) : null}

      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-success/40 bg-success-soft px-3 py-2 text-sm text-success-ink"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink">
          {error}
        </p>
      ) : null}
    </SettingsSubpage>
  );
}
