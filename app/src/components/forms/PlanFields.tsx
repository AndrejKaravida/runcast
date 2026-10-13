import { useTranslation } from 'react-i18next';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { PlanDraft } from '@/lib/plan-form';

export type PlanFieldsGroup = 'race' | 'goal' | 'schedule' | 'experience';
type PlanFieldsVariant = 'onboarding' | 'settings';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

interface PlanFieldsLabels {
  raceDate: string;
  distance: string;
  goalTime: string;
  goalTimeHint: string | null;
  recentDistance: string;
  recentTime: string;
  daysPerWeek: string;
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
  const labels = LABELS[variant];
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
              onChange={(daysPerWeek) => onChange({ daysPerWeek })}
              options={[
                { value: 3, label: '3' },
                { value: 4, label: '4' },
                { value: 5, label: '5' },
                { value: 6, label: '6' },
              ]}
            />
          </div>
          <AppSelect
            label={t(labels.longRunDay)}
            value={String(value.longRunDay)}
            onChange={(event) => onChange({ longRunDay: Number(event.target.value) })}
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
