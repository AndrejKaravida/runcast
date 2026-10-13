import { defaultRunDays } from '@runcast/shared';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { PlanDraft } from '@/lib/plan-form';

export type PlanFieldsGroup = 'race' | 'goal' | 'schedule' | 'experience';
type PlanFieldsVariant = 'onboarding' | 'settings';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const REMOVE_ORDER = [6, 0, 1, 5, 3, 4, 2];

function normalizeRunDays(runDays: number[], daysPerWeek: number, longRunDay: number): number[] {
  const next = [...new Set(runDays)];
  if (!next.includes(longRunDay)) next.push(longRunDay);
  for (const day of REMOVE_ORDER) {
    if (next.length <= daysPerWeek) break;
    if (day === longRunDay) continue;
    const index = next.indexOf(day);
    if (index >= 0) next.splice(index, 1);
  }
  if (next.length < daysPerWeek) {
    for (const day of defaultRunDays(daysPerWeek, longRunDay)) {
      if (next.length >= daysPerWeek) break;
      if (!next.includes(day)) next.push(day);
    }
  }
  return next.sort((a, b) => a - b);
}

interface PlanFieldsLabels {
  raceDate: string;
  distance: string;
  goalTime: string;
  goalTimeHint: string | null;
  recentDistance: string;
  recentTime: string;
  daysPerWeek: string;
  runDays: string;
  runDaysHint: string;
  longRunDay: string;
  experience: string;
  experienceFirst: string;
  experienceExperienced: string;
  distanceMarathon: string;
  distanceHalf: string;
  distanceTen: string;
  distanceFive: string;
}

const LABELS: Record<PlanFieldsVariant, PlanFieldsLabels> = {
  onboarding: {
    raceDate: 'fields.raceDate',
    distance: 'fields.distance',
    goalTime: 'fields.goalTime',
    goalTimeHint: 'steps.goal.goalTimeHint',
    recentDistance: 'fields.recentRace',
    recentTime: 'fields.recentTime',
    daysPerWeek: 'steps.schedule.daysLabel',
    runDays: 'steps.schedule.runDays',
    runDaysHint: 'steps.schedule.runDaysHint',
    longRunDay: 'fields.longRunDay',
    experience: 'fields.experience',
    experienceFirst: 'experience.first',
    experienceExperienced: 'experience.experienced',
    distanceMarathon: 'distance.marathon',
    distanceHalf: 'distance.half',
    distanceTen: 'distance.ten',
    distanceFive: 'distance.five',
  },
  settings: {
    raceDate: 'plan.raceDate',
    distance: 'plan.distance',
    goalTime: 'plan.goalTime',
    goalTimeHint: null,
    recentDistance: 'plan.recentDistance',
    recentTime: 'plan.recentTime',
    daysPerWeek: 'plan.daysPerWeek',
    runDays: 'plan.runDays',
    runDaysHint: 'plan.runDaysHint',
    longRunDay: 'plan.longRunDay',
    experience: 'plan.experience',
    experienceFirst: 'plan.experienceFirst',
    experienceExperienced: 'plan.experienceExperienced',
    distanceMarathon: 'plan.marathon',
    distanceHalf: 'plan.half',
    distanceTen: 'plan.ten',
    distanceFive: 'plan.five',
  },
};

interface PlanFieldsProps {
  variant: PlanFieldsVariant;
  groups: PlanFieldsGroup[];
  value: PlanDraft;
  onChange: (patch: Partial<PlanDraft>) => void;
}

export function PlanFields({ variant, groups, value, onChange }: PlanFieldsProps) {
  const { t } = useTranslation(variant);
  const { t: tPlan } = useTranslation('plan');
  const labels = LABELS[variant];

  function toggleDay(day: number) {
    const runDays = value.runDays.includes(day)
      ? value.runDays.filter((item) => item !== day)
      : [...value.runDays, day].sort((a, b) => a - b);
    onChange({ runDays });
  }
  const raceDistances = [
    { value: '42.195', label: labels.distanceMarathon },
    { value: '21.0975', label: labels.distanceHalf },
    { value: '10', label: labels.distanceTen },
    { value: '5', label: labels.distanceFive },
  ];
  const recentDistances = [
    { value: '21.0975', label: labels.distanceHalf },
    { value: '10', label: labels.distanceTen },
    { value: '5', label: labels.distanceFive },
  ];

  return (
    <>
      {groups.includes('race') ? (
        <>
          <AppInput
            label={t(labels.raceDate)}
            type="date"
            value={value.raceDate}
            onChange={(event) => onChange({ raceDate: event.target.value })}
          />
          <AppSelect
            label={t(labels.distance)}
            value={value.distanceKm}
            onChange={(event) => onChange({ distanceKm: event.target.value })}
          >
            {raceDistances.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </AppSelect>
        </>
      ) : null}

      {groups.includes('goal') ? (
        <>
          <AppInput
            label={t(labels.goalTime)}
            placeholder="3:45:00"
            value={value.goalTime}
            onChange={(event) => onChange({ goalTime: event.target.value })}
            hint={labels.goalTimeHint ? t(labels.goalTimeHint) : undefined}
          />
          {variant === 'onboarding' ? (
            <div className="flex items-center gap-3 text-caption text-text-muted">
              <span className="h-px flex-1 bg-border" />
              {t('steps.goal.or')}
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <AppSelect
              label={t(labels.recentDistance)}
              value={value.recentDistanceKm}
              onChange={(event) => onChange({ recentDistanceKm: event.target.value })}
            >
              <option value="">—</option>
              {recentDistances.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </AppSelect>
            <AppInput
              label={t(labels.recentTime)}
              placeholder={variant === 'onboarding' ? '25:30' : '50:30'}
              value={value.recentTime}
              onChange={(event) => onChange({ recentTime: event.target.value })}
            />
          </div>
        </>
      ) : null}

      {groups.includes('schedule') ? (
        <>
          <div>
            <p className="section-label mb-1.5">{t(labels.daysPerWeek)}</p>
            <SegmentedControl
              value={value.daysPerWeek}
              onChange={(daysPerWeek) =>
                onChange({ daysPerWeek, runDays: normalizeRunDays(value.runDays, daysPerWeek, value.longRunDay) })
              }
              options={[
                { value: 3, label: '3' },
                { value: 4, label: '4' },
                { value: 5, label: '5' },
                { value: 6, label: '6' },
              ]}
            />
          </div>
          <div>
            <p className="section-label mb-1.5">{t(labels.runDays)}</p>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_KEYS.map((key, index) => {
                const selected = value.runDays.includes(index);
                const isLong = selected && index === value.longRunDay;
                return (
                  <button
                    key={key}
                    type="button"
                    data-testid={`plan-day-${index}`}
                    aria-pressed={selected}
                    onClick={() => toggleDay(index)}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 rounded-lg px-1 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.97]',
                      isLong ? 'bg-rain-soft' : selected ? 'bg-primary-soft' : 'bg-surface-elevated',
                    )}
                  >
                    <span
                      className={clsx(
                        'section-label',
                        isLong ? 'text-rain-ink' : selected ? 'text-primary-ink' : 'text-text-muted',
                      )}
                    >
                      {variant === 'onboarding' ? t(`days.short.${key}`) : tPlan(`days.${key}`)}
                    </span>
                    <span
                      className={clsx(
                        'h-1.5 w-1.5 rounded-full',
                        isLong ? 'bg-rain-ink' : selected ? 'bg-primary-ink' : 'bg-text-muted',
                      )}
                    />
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-caption text-text-muted">{t(labels.runDaysHint)}</p>
          </div>
          <AppSelect
            label={t(labels.longRunDay)}
            value={String(value.longRunDay)}
            onChange={(event) => {
              const longRunDay = Number(event.target.value);
              onChange({ longRunDay, runDays: normalizeRunDays(value.runDays, value.daysPerWeek, longRunDay) });
            }}
          >
            {DAY_KEYS.map((key, index) => (
              <option key={key} value={index}>
                {t(`days.${key}`)}
              </option>
            ))}
          </AppSelect>
        </>
      ) : null}

      {groups.includes('experience') ? (
        <div>
          <p className="section-label mb-1.5">{t(labels.experience)}</p>
          <SegmentedControl
            value={value.experience}
            onChange={(experience) => onChange({ experience })}
            options={[
              { value: 'first', label: t(labels.experienceFirst) },
              { value: 'experienced', label: t(labels.experienceExperienced) },
            ]}
          />
        </div>
      ) : null}
    </>
  );
}
