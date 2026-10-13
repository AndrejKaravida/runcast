import { useEffect, useState } from 'react';
import { defaultRunDays, formatDuration, isRunType, type RunWindow, type VolumeBand } from '@runcast/shared';
import { Download, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppModal } from '@/components/ui/AppModal';
import { AppSelect } from '@/components/ui/AppSelect';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import { PlanFields } from '@/components/forms/PlanFields';
import { RaceForm } from '@/components/forms/RaceForm';
import { useExportPlanIcs } from '@/features/plans/export';
import { planPaces } from '@/features/plans/plan-data';
import {
  RaceDeleteBlockedError,
  useActivePlan,
  useAddRace,
  useDeleteRace,
  useGeneratePlan,
  useRaces,
  useUpdateRace,
  useWorkoutsRange,
  type GeneratePlanInput,
} from '@/features/plans/queries';
import { useProfile } from '@/features/profile/queries';
import { dayDiff, formatDateShort, startOfWeekIso, todayIso, weekdayIndex } from '@/lib/dates';
import {
  buildPlanInput,
  parseOptionalTime,
  validatePlanDraft,
  type PlanDraft,
  type PlanDraftError,
} from '@/lib/plan-form';
import type { RacesRow, WorkoutsRow } from '@/types';

const QUALITY_TYPES = ['TEMPO', 'INTERVALS', 'REPETITIONS'];

function planRunDays(workouts: WorkoutsRow[], daysPerWeek: number, fallback: number[]): number[] {
  const weeks = new Map<string, { days: Set<number>; quality: boolean }>();
  for (const workout of workouts) {
    if (!isRunType(workout.type)) continue;
    const week = startOfWeekIso(workout.workout_date);
    const entry = weeks.get(week) ?? { days: new Set<number>(), quality: false };
    entry.days.add(weekdayIndex(workout.workout_date));
    if (QUALITY_TYPES.includes(workout.type)) entry.quality = true;
    weeks.set(week, entry);
  }
  const full = [...weeks.values()].filter((entry) => entry.days.size === daysPerWeek);
  const chosen = full.find((entry) => entry.quality) ?? full[0];
  return chosen ? [...chosen.days].sort((a, b) => a - b) : fallback;
}

function emptyRaceDraft(): PlanDraft {
  return {
    raceName: '',
    raceDate: '',
    distanceKm: '42.195',
    goalTime: '',
    recentDistanceKm: '',
    recentTime: '',
    daysPerWeek: 4,
    longRunDay: 6,
    runDays: defaultRunDays(4, 6),
    experience: 'first',
  };
}

function PlanSettingsSkeleton() {
  return (
    <div data-testid="plan-settings-skeleton" className="space-y-6">
      <Skeleton className="h-44" />
      <Skeleton className="h-11" />
    </div>
  );
}

export function SettingsPlanPage() {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: profile } = useProfile();
  const { data: plan, isLoading: planLoading } = useActivePlan();
  const { data: races = [] } = useRaces();
  const { data: planWorkouts = [] } = useWorkoutsRange(plan?.start_date ?? todayIso(), plan?.race_date ?? todayIso());
  const generatePlan = useGeneratePlan();
  const updateRace = useUpdateRace();
  const addRace = useAddRace();
  const deleteRace = useDeleteRace();
  const exportPlan = useExportPlanIcs();

  const [planFormDraft, setPlanFormDraft] = useState<PlanDraft | null>(null);
  const [raceTargetExplicit, setRaceTargetExplicit] = useState('');
  const [raceForm, setRaceForm] = useState<{ id: string; draft: PlanDraft } | null>(null);
  const [raceDraft, setRaceDraft] = useState<PlanDraft | null>(null);
  const [raceAddForm, setRaceAddForm] = useState<PlanDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RacesRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingInput, setPendingInput] = useState<GeneratePlanInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialRaceParam] = useState(() => searchParams.get('race'));
  const [raceParamDismissed, setRaceParamDismissed] = useState(false);

  useEffect(() => {
    if (searchParams.get('race')) navigate('/settings/plan', { replace: true });
  }, [searchParams, navigate]);

  const futureRaces = races.filter((race) => dayDiff(todayIso(), race.race_date) > 0);
  const paramRace =
    initialRaceParam && !raceParamDismissed ? (futureRaces.find((race) => race.id === initialRaceParam) ?? null) : null;
  const planForm = planFormDraft ?? (paramRace ? buildRaceDraft(paramRace) : null);
  const raceTarget = planFormDraft ? raceTargetExplicit : (paramRace?.id ?? '');

  function buildPlanForm(): PlanDraft {
    const race = plan?.races ?? null;
    const daysPerWeek = (plan?.days_per_week as 3 | 4 | 5 | 6) ?? 4;
    const longRunDay = plan?.long_run_day ?? 6;
    const fallbackDays = defaultRunDays(daysPerWeek, longRunDay);
    const runDays = planWorkouts.length > 0 ? planRunDays(planWorkouts, daysPerWeek, fallbackDays) : fallbackDays;
    const hasValidSchedule = runDays.length === daysPerWeek && runDays.includes(longRunDay);
    return {
      raceName: race?.name ?? '',
      raceDate: race?.race_date ?? plan?.race_date ?? '',
      distanceKm: race ? String(race.distance_km) : '42.195',
      goalTime: race?.goal_time_sec ? formatDuration(race.goal_time_sec) : '',
      recentDistanceKm: '',
      recentTime: '',
      daysPerWeek,
      longRunDay,
      runDays: hasValidSchedule ? runDays : fallbackDays,
      experience: profile?.experience === 'experienced' ? 'experienced' : 'first',
    };
  }

  function buildRaceDraft(race: RacesRow): PlanDraft {
    return {
      ...buildPlanForm(),
      raceName: race.name ?? '',
      raceDate: race.race_date,
      distanceKm: String(race.distance_km),
      goalTime: race.goal_time_sec ? formatDuration(race.goal_time_sec) : '',
    };
  }

  function planErrorText(draft: PlanDraft, draftError: PlanDraftError): string {
    if (draftError === 'daysCount') return t('errors.daysCount', { count: draft.daysPerWeek });
    return t(`errors.${draftError}`);
  }

  function collectPlanInput(draft: PlanDraft): GeneratePlanInput | null {
    setError(null);
    setNotice(null);
    const draftError = validatePlanDraft(draft, ['raceDate', 'goalTime', 'recentRace', 'schedule'], todayIso());
    if (draftError) {
      setError(planErrorText(draft, draftError));
      return null;
    }
    return buildPlanInput(draft, {
      hasRace: true,
      raceName: draft.raceName,
      volumeBand: (profile?.volume_band as VolumeBand | null) ?? '20-40',
    });
  }

  async function runGenerate(input: GeneratePlanInput) {
    try {
      await generatePlan.mutateAsync(input);
      setPlanFormDraft(null);
      setRaceParamDismissed(true);
      setRaceDraft(null);
      setNotice(t('plan.generated'));
    } catch {
      setError(t('plan.generateFailed'));
    }
  }

  function openPlanForm() {
    setPlanFormDraft(buildPlanForm());
    setRaceTargetExplicit(plan?.races && dayDiff(todayIso(), plan.races.race_date) > 0 ? plan.races.id : '');
  }

  function closePlanForm() {
    setPlanFormDraft(null);
    setRaceParamDismissed(true);
  }

  function handleRaceTargetChange(id: string) {
    if (!planForm) return;
    setRaceTargetExplicit(id);
    const race = races.find((item) => item.id === id);
    if (!race) return;
    setPlanFormDraft({
      ...planForm,
      raceName: race.name ?? '',
      raceDate: race.race_date,
      distanceKm: String(race.distance_km),
      goalTime: race.goal_time_sec ? formatDuration(race.goal_time_sec) : '',
    });
  }

  function handleGenerateClick(draft: PlanDraft | null = planForm) {
    if (!draft) return;
    const input = collectPlanInput(draft);
    if (!input) return;
    const withTarget: GeneratePlanInput = { ...input, raceId: raceTarget || undefined };
    const usesBasePlan = !input.recentRace && !input.race?.goalTimeSec;
    if (usesBasePlan) {
      setPendingInput(withTarget);
      return;
    }
    void runGenerate(withTarget);
  }

  function openRaceEdit(race: RacesRow) {
    setError(null);
    setNotice(null);
    setRaceForm({ id: race.id, draft: buildRaceDraft(race) });
  }

  function handleRaceRegenerate() {
    if (!raceDraft || !plan?.races?.id) return;
    const input = collectPlanInput(raceDraft);
    if (!input) return;
    void runGenerate({ ...input, raceId: plan.races.id });
  }

  async function handleRaceSave() {
    if (!raceForm) return;
    setError(null);
    setNotice(null);
    const draftError = validatePlanDraft(raceForm.draft, ['raceDate', 'goalTime'], todayIso());
    if (draftError) {
      setError(planErrorText(raceForm.draft, draftError));
      return;
    }
    try {
      await updateRace.mutateAsync({
        id: raceForm.id,
        name: raceForm.draft.raceName.trim() || null,
        raceDate: raceForm.draft.raceDate,
        distanceKm: Number(raceForm.draft.distanceKm),
        goalTimeSec: parseOptionalTime(raceForm.draft.goalTime),
      });
    } catch {
      setError(t('plan.raceEditFailed'));
      return;
    }
    setRaceDraft(plan?.races?.id === raceForm.id ? raceForm.draft : null);
    setRaceForm(null);
    setNotice(t('plan.raceEdited'));
  }

  async function handleRaceAdd() {
    if (!raceAddForm) return;
    setError(null);
    setNotice(null);
    const draftError = validatePlanDraft(raceAddForm, ['raceDate', 'goalTime'], todayIso());
    if (draftError) {
      setError(planErrorText(raceAddForm, draftError));
      return;
    }
    try {
      await addRace.mutateAsync({
        name: raceAddForm.raceName.trim() || null,
        raceDate: raceAddForm.raceDate,
        distanceKm: Number(raceAddForm.distanceKm),
        goalTimeSec: parseOptionalTime(raceAddForm.goalTime),
      });
    } catch {
      setError(t('plan:races.addFailed'));
      return;
    }
    setRaceAddForm(null);
    setNotice(t('plan:races.added'));
  }

  async function handleRaceDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setNotice(null);
    try {
      await deleteRace.mutateAsync(deleteTarget.id);
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof RaceDeleteBlockedError ? t('plan:races.deleteBlocked') : t('plan:races.deleteFailed'),
      );
      return;
    }
    setDeleteTarget(null);
    setNotice(t('plan:races.deleted'));
  }

  async function handleExportPlan() {
    if (!plan) return;
    setError(null);
    setNotice(null);
    try {
      await exportPlan.mutateAsync({
        planId: plan.id,
        runWindow: (profile?.run_window as RunWindow | undefined) ?? 'morning',
        paces: planPaces(plan),
      });
      setNotice(t('plan.exported'));
    } catch {
      setError(t('plan.exportFailed'));
    }
  }

  const daysToRace = plan ? dayDiff(todayIso(), plan.race_date) : null;

  return (
    <SettingsSubpage
      title={t('plan.label')}
      action={plan ? <AppBadge tone="primary">{t('plan.weeks', { weeks: plan.weeks })}</AppBadge> : null}
    >
      {planLoading ? (
        <PlanSettingsSkeleton />
      ) : (
        <>
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

          <AppCard className="space-y-3">
            <p className="section-label">{t('plan:races.title')}</p>
            {races.length > 0 ? (
              <ul className="space-y-2">
                {races.map((race) => {
                  const daysUntil = dayDiff(todayIso(), race.race_date);
                  const isPlanTarget = plan?.races?.id === race.id;
                  return (
                    <li key={race.id} data-testid="race-row" className="rounded-xl bg-surface-elevated p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{race.name ?? t('plan.raceFallback')}</p>
                          <p className="num text-caption text-text-muted">
                            {t('plan:races.meta', {
                              date: formatDateShort(race.race_date),
                              distance: race.distance_km,
                            })}
                          </p>
                          <p className="text-caption text-text-muted">
                            {daysUntil < 0
                              ? t('plan:races.passed')
                              : t(daysUntil === 1 ? 'plan:races.inDaysOne' : 'plan:races.inDaysMany', {
                                  days: daysUntil,
                                })}
                          </p>
                        </div>
                        {isPlanTarget ? <AppBadge tone="primary">{t('plan:races.planTarget')}</AppBadge> : null}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <AppButton size="sm" variant="secondary" className="w-auto" onClick={() => openRaceEdit(race)}>
                          <Pencil className="h-4 w-4" aria-hidden /> {t('plan.editRace')}
                        </AppButton>
                        <AppButton
                          size="sm"
                          variant="ghost"
                          className="w-auto"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(race);
                          }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden /> {t('plan:races.delete')}
                        </AppButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">{t('plan:races.empty')}</p>
            )}
            {raceAddForm ? (
              <div className="space-y-3 rounded-xl bg-surface-elevated p-3">
                <p className="text-sm font-medium">{t('plan:races.addTitle')}</p>
                <RaceForm value={raceAddForm} onChange={(patch) => setRaceAddForm({ ...raceAddForm, ...patch })} />
                <div className="flex gap-3">
                  <AppButton variant="secondary" className="flex-1" onClick={() => setRaceAddForm(null)}>
                    {t('cancel')}
                  </AppButton>
                  <AppButton className="flex-1" loading={addRace.isPending} onClick={() => void handleRaceAdd()}>
                    {t('plan.raceSave')}
                  </AppButton>
                </div>
              </div>
            ) : (
              <AppButton variant="secondary" className="w-full" onClick={() => setRaceAddForm(emptyRaceDraft())}>
                <Plus className="h-4 w-4" aria-hidden /> {t('plan:races.add')}
              </AppButton>
            )}
          </AppCard>

          {planForm ? (
            <AppCard className="space-y-3">
              <p className="text-sm font-medium">{t('plan.newPlan')}</p>
              <AppSelect
                label={t('plan:races.targetLabel')}
                value={raceTarget}
                onChange={(event) => handleRaceTargetChange(event.target.value)}
              >
                <option value="">{t('plan:races.targetNew')}</option>
                {futureRaces.map((race) => (
                  <option key={race.id} value={race.id}>
                    {t('plan:races.targetOption', {
                      name: race.name ?? t('plan.raceFallback'),
                      date: formatDateShort(race.race_date),
                    })}
                  </option>
                ))}
              </AppSelect>
              <PlanFields
                variant="settings"
                groups={['race', 'goal', 'schedule', 'experience']}
                value={planForm}
                onChange={(patch) => setPlanFormDraft({ ...planForm, ...patch })}
              />
              <div className="flex gap-3">
                <AppButton variant="secondary" className="flex-1" onClick={closePlanForm}>
                  {t('cancel')}
                </AppButton>
                <AppButton className="flex-1" loading={generatePlan.isPending} onClick={() => handleGenerateClick()}>
                  <RefreshCw className="h-4 w-4" aria-hidden /> {t('plan.generate')}
                </AppButton>
              </div>
            </AppCard>
          ) : (
            <AppButton variant="secondary" className="w-full" onClick={openPlanForm}>
              <RefreshCw className="h-4 w-4" aria-hidden /> {t('plan.generateNew')}
            </AppButton>
          )}
        </>
      )}

      {notice ? (
        <p className="rounded-xl border border-success/40 bg-success-soft px-3 py-2 text-sm text-success-ink">
          {notice}
        </p>
      ) : null}
      {raceDraft && plan ? (
        <AppButton
          variant="secondary"
          className="w-full"
          loading={generatePlan.isPending}
          onClick={handleRaceRegenerate}
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> {t('plan.raceRegenerate')}
        </AppButton>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink">{error}</p>
      ) : null}

      <AppModal open={raceForm !== null} onClose={() => setRaceForm(null)} title={t('plan.raceEditTitle')}>
        {raceForm ? (
          <div className="space-y-3">
            <RaceForm
              value={raceForm.draft}
              onChange={(patch) => setRaceForm({ ...raceForm, draft: { ...raceForm.draft, ...patch } })}
            />
            <div className="flex gap-3">
              <AppButton variant="secondary" className="flex-1" onClick={() => setRaceForm(null)}>
                {t('cancel')}
              </AppButton>
              <AppButton className="flex-1" loading={updateRace.isPending} onClick={() => void handleRaceSave()}>
                {t('plan.raceSave')}
              </AppButton>
            </div>
          </div>
        ) : null}
      </AppModal>

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

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('plan:races.deleteTitle')}
        description={t('plan:races.deleteText', {
          name: deleteTarget?.name ?? t('plan.raceFallback'),
        })}
        confirmLabel={t('plan:races.delete')}
        tone="danger"
        loading={deleteRace.isPending}
        error={deleteError ?? undefined}
        onConfirm={() => void handleRaceDelete()}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </SettingsSubpage>
  );
}
