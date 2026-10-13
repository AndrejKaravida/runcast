import { useState } from 'react';
import { formatDuration, type RunWindow, type VolumeBand } from '@runcast/shared';
import { Download, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import { PlanFields } from '@/components/forms/PlanFields';
import { useExportPlanIcs } from '@/features/plans/export';
import { planPaces } from '@/features/plans/plan-data';
import { useActivePlan, useGeneratePlan, type GeneratePlanInput } from '@/features/plans/queries';
import { useProfile } from '@/features/profile/queries';
import { dayDiff, formatDateShort, todayIso } from '@/lib/dates';
import { buildPlanInput, validatePlanDraft, type PlanDraft } from '@/lib/plan-form';

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
  const { data: profile } = useProfile();
  const { data: plan, isLoading: planLoading } = useActivePlan();
  const generatePlan = useGeneratePlan();
  const exportPlan = useExportPlanIcs();

  const [planForm, setPlanForm] = useState<PlanDraft | null>(null);
  const [pendingInput, setPendingInput] = useState<GeneratePlanInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        </>
      )}

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
    </SettingsSubpage>
  );
}
