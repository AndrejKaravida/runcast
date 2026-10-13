import { useMemo, useState } from 'react';
import {
  assessWorkoutWeather,
  defaultRecoveryRunDays,
  formatDuration,
  formatPace,
  predictRaceTimes,
  raceChecklist,
  raceWeatherNote,
  runWindowHours,
  vdotFromPlan,
  type ChecklistGroup,
  type ChecklistItem,
  type RunWindow,
} from '@runcast/shared';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppLinkButton } from '@/components/ui/AppLinkButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryError } from '@/components/ui/QueryError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatRow } from '@/components/ui/StatRow';
import { RaceDayCard } from '@/components/workouts/RaceDayCard';
import { planAnchor, planPaces } from '@/features/plans/plan-data';
import { useActivePlan, useGenerateRecoveryPlan } from '@/features/plans/queries';
import { useProfile } from '@/features/profile/queries';
import { useWeather } from '@/features/weather/queries';
import { dayDiff, formatDateLong, todayIso } from '@/lib/dates';

const CHECKLIST_STORAGE_PREFIX = 'runcast.raceDay.checklist';
const FORECAST_HORIZON_DAYS = 6;

const FINAL_WEEK_TIP_KEYS = [
  'finalWeek.tip1',
  'finalWeek.tip2',
  'finalWeek.tip3',
  'finalWeek.tip4',
  'finalWeek.tip5',
  'finalWeek.tip6',
];

const CHECKLIST_GROUPS: { key: ChecklistGroup; labelKey: string }[] = [
  { key: 'dan_pre', labelKey: 'checklist.evening' },
  { key: 'jutro', labelKey: 'checklist.morning' },
  { key: 'staza', labelKey: 'checklist.course' },
];

function readChecklist(storageKey: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeChecklist(storageKey: string, checked: string[]): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(checked));
  } catch {
    return;
  }
}

function useRaceChecklist(raceDate: string, items: ChecklistItem[]) {
  const storageKey = `${CHECKLIST_STORAGE_PREFIX}.${raceDate}`;
  const [checked, setChecked] = useState<string[]>(() => readChecklist(storageKey));
  const valid = checked.filter((id) => items.some((item) => item.id === id));

  function toggle(id: string) {
    setChecked((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      writeChecklist(storageKey, next);
      return next;
    });
  }

  return { checked: valid, toggle };
}

interface RaceChecklistCardProps {
  raceDate: string;
  items: ChecklistItem[];
}

function RaceChecklistCard({ raceDate, items }: RaceChecklistCardProps) {
  const { t } = useTranslation('race');
  const checklist = useRaceChecklist(raceDate, items);

  return (
    <AppCard data-testid="race-checklist" className="space-y-3">
      <SectionHeader
        label={t('checklist.title')}
        action={
          <span className="num text-caption text-text-muted">
            {checklist.checked.length}/{items.length}
          </span>
        }
      />
      {CHECKLIST_GROUPS.map((group) => (
        <div key={group.key} className="space-y-1">
          <p className="section-label">{t(group.labelKey)}</p>
          <ul className="divide-y divide-border">
            {items
              .filter((item) => item.group === group.key)
              .map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-3 py-2.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 accent-primary"
                      checked={checklist.checked.includes(item.id)}
                      onChange={() => checklist.toggle(item.id)}
                    />
                    <span className="min-w-0 flex-1 text-sm text-text-secondary">
                      {t(item.label.key, item.label.params)}
                    </span>
                  </label>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </AppCard>
  );
}

function RaceDaySkeleton() {
  return (
    <div data-testid="raceday-skeleton" className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="space-y-2 rounded-2xl border border-primary/40 bg-gradient-to-b from-primary-soft to-transparent p-4">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-10 w-24" />
        <div className="grid grid-cols-2 divide-x divide-border rounded-xl bg-surface-elevated py-1">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="flex min-w-0 flex-col gap-1 px-3 py-2">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
        <div className="space-y-1 rounded-xl bg-surface-elevated p-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-3 w-40" />
        <div className="space-y-1">
          {Array.from({ length: 6 }, (_, row) => (
            <div key={row} className="flex items-center justify-between gap-2 py-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </div>
        <div className="space-y-1 rounded-xl bg-surface-elevated p-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-10" />
        </div>
        {Array.from({ length: 3 }, (_, group) => (
          <div key={group} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            {Array.from({ length: 3 }, (_, row) => (
              <div key={row} className="flex items-center gap-3 py-2.5">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-4 w-5/6" />
        ))}
      </div>
    </div>
  );
}

export function RaceDayPage() {
  const { t } = useTranslation('race');
  const { t: tPlan } = useTranslation('plan');
  const navigate = useNavigate();
  const today = todayIso();
  const { data: plan, isLoading, isError, refetch } = useActivePlan();
  const { data: profile } = useProfile();
  const weather = useWeather();
  const generateRecovery = useGenerateRecoveryPlan();
  const [recoveryError, setRecoveryError] = useState(false);
  const raceInfo = plan?.races ?? null;
  const distanceKm = raceInfo?.distance_km ?? 0;
  const hasDistance = distanceKm > 0;
  const raceDate = raceInfo?.race_date ?? today;
  const daysToRace = raceInfo ? dayDiff(today, raceInfo.race_date) : null;
  const runWindow: RunWindow = (profile?.run_window as RunWindow | undefined) ?? 'morning';
  const window = runWindowHours(runWindow);

  const goalTimeSec = useMemo(() => {
    if (!raceInfo || raceInfo.distance_km <= 0) return null;
    if (raceInfo.goal_time_sec) return raceInfo.goal_time_sec;
    const vdot = vdotFromPlan({
      paces: planPaces(plan),
      anchor: planAnchor(plan),
    });
    if (!vdot) return null;
    return predictRaceTimes(vdot, [raceInfo.distance_km])?.[0]?.timeSec ?? null;
  }, [raceInfo, plan]);

  const weatherNote = useMemo(() => {
    const withinForecast = daysToRace !== null && daysToRace >= 0 && daysToRace <= FORECAST_HORIZON_DAYS;
    if (!withinForecast || !weather.data || !raceInfo) return null;
    const assessment = assessWorkoutWeather({
      type: 'RACE',
      hours: weather.data.hours,
      pm25: weather.data.air,
      windowStartHour: window.startHour,
      windowEndHour: window.endHour,
      date: raceInfo.race_date,
    });
    return raceWeatherNote(assessment);
  }, [daysToRace, weather.data, raceInfo, window.startHour, window.endHour]);

  const items = useMemo(() => raceChecklist(distanceKm), [distanceKm]);
  const forecastPending =
    weather.isLoading && daysToRace !== null && daysToRace >= 0 && daysToRace <= FORECAST_HORIZON_DAYS;

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 py-6">
        <RaceDaySkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 py-6">
        <QueryError onRetry={() => void refetch()} />
      </div>
    );
  }

  if (!plan || !raceInfo) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 py-6">
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <AppLinkButton to="/settings" size="sm">
              {t('openSettings')}
            </AppLinkButton>
          }
        />
      </div>
    );
  }

  const racePassed = daysToRace !== null && daysToRace < 0;

  async function handleRecovery() {
    try {
      setRecoveryError(false);
      await generateRecovery.mutateAsync({
        startDate: today,
        runDays: defaultRecoveryRunDays(plan?.days_per_week ?? 4),
      });
      navigate('/plan');
    } catch {
      setRecoveryError(true);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <AppButton variant="ghost" size="sm" className="-ml-2 w-auto" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> {t('common:actions.back')}
        </AppButton>
      </div>

      <AppCard className="space-y-2 border-primary/40 bg-gradient-to-b from-primary-soft to-transparent">
        <p className="section-label">{t('label')}</p>
        <h1 className="text-2xl font-semibold tracking-display">{raceInfo.name ?? t('untitled')}</h1>
        <p className="num text-sm text-text-secondary">
          {formatDateLong(raceInfo.race_date)}
          {hasDistance ? ` · ${raceInfo.distance_km} km` : ''}
        </p>
        {daysToRace !== null && daysToRace >= 0 ? (
          <p className="flex items-baseline gap-2">
            <span className="num value-swap text-hero font-bold text-primary-ink">{daysToRace}</span>
            <span className="text-sm text-text-secondary">
              {daysToRace === 0 ? t('daysTo.today') : t('daysTo.upcoming')}
            </span>
          </p>
        ) : null}
        {goalTimeSec ? (
          <StatRow
            items={[
              { label: t('goal.time'), value: formatDuration(goalTimeSec) },
              {
                label: t('goal.pace'),
                value: `${formatPace(Math.round(goalTimeSec / raceInfo.distance_km))} /km`,
              },
            ]}
            className="rounded-xl bg-surface-elevated py-1"
          />
        ) : (
          <div className="rounded-xl bg-surface-elevated p-3">
            <p className="text-sm text-text-secondary">{hasDistance ? t('goal.missing') : t('goal.missingDistance')}</p>
            <Link
              to="/settings"
              className="mt-1 inline-block text-sm font-medium text-primary-ink hover:text-primary-ink-hover"
            >
              {t('openSettings')}
            </Link>
          </div>
        )}
        {weatherNote ? (
          <div className="rounded-xl bg-surface-elevated p-3">
            <p className="section-label">{t('forecast')}</p>
            <p className="mt-1 text-sm text-text-secondary">{t(weatherNote.key, weatherNote.params)}</p>
          </div>
        ) : forecastPending ? (
          <div data-testid="raceday-forecast-skeleton" className="space-y-1 rounded-xl bg-surface-elevated p-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : null}
      </AppCard>

      {racePassed ? (
        <AppCard
          data-testid="recovery-card"
          className="space-y-3 border-primary/40 bg-gradient-to-b from-primary-soft to-transparent"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">{tPlan('recovery.title')}</p>
            <p className="text-sm text-text-secondary">{tPlan('recovery.description')}</p>
            <p className="text-caption text-text-muted">{tPlan('recovery.warning')}</p>
          </div>
          <div className="flex gap-3">
            <AppButton
              className="flex-1"
              loading={generateRecovery.isPending}
              data-testid="recovery-generate"
              onClick={() => void handleRecovery()}
            >
              {tPlan('recovery.action')}
            </AppButton>
          </div>
          {recoveryError ? <p className="text-caption text-danger-ink">{tPlan('recovery.error')}</p> : null}
        </AppCard>
      ) : null}

      {goalTimeSec ? <RaceDayCard goalTimeSec={goalTimeSec} distanceKm={raceInfo.distance_km} /> : null}

      <RaceChecklistCard key={raceDate} raceDate={raceDate} items={items} />

      <AppCard className="space-y-2">
        <SectionHeader label={t('finalWeek.title')} />
        <ul className="space-y-1.5">
          {FINAL_WEEK_TIP_KEYS.map((key) => (
            <li key={key} className="flex gap-2 text-sm text-text-secondary">
              <span className="text-primary-ink" aria-hidden>
                •
              </span>
              <span className="min-w-0 flex-1">{t(key)}</span>
            </li>
          ))}
        </ul>
      </AppCard>
    </div>
  );
}
