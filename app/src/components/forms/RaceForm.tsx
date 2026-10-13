import { useTranslation } from 'react-i18next';
import { PlanFields } from '@/components/forms/PlanFields';
import { AppInput } from '@/components/ui/AppInput';
import type { PlanDraft } from '@/lib/plan-form';

interface RaceFormProps {
  value: PlanDraft;
  onChange: (patch: Partial<PlanDraft>) => void;
}

export function RaceForm({ value, onChange }: RaceFormProps) {
  const { t } = useTranslation('settings');

  return (
    <>
      <AppInput
        label={t('plan.raceName')}
        value={value.raceName}
        onChange={(event) => onChange({ raceName: event.target.value })}
      />
      <PlanFields variant="settings" groups={['race']} value={value} onChange={onChange} />
      <AppInput
        label={t('plan.goalTime')}
        placeholder="3:45:00"
        value={value.goalTime}
        onChange={(event) => onChange({ goalTime: event.target.value })}
      />
    </>
  );
}
