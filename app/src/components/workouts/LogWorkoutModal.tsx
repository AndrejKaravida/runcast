import { useState } from 'react';
import { formatDuration, parseTimeToSeconds, runLogSchema } from '@runcast/shared';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppModal } from '@/components/ui/AppModal';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppTextarea } from '@/components/ui/AppTextarea';
import { useShoes } from '@/features/gear/queries';
import { useLogWorkout } from '@/features/logs/queries';
import type { WorkoutsRow } from '@/types';

interface LogWorkoutPrefill {
  distanceKm?: number;
  durationSec?: number;
  source?: 'gps' | 'manual';
}

interface LogWorkoutModalProps {
  workout: WorkoutsRow | null;
  open: boolean;
  onClose: () => void;
  prefill?: LogWorkoutPrefill;
}

export function LogWorkoutModal({ workout, open, onClose, prefill }: LogWorkoutModalProps) {
  const { t } = useTranslation('workout');
  if (!workout) return null;
  return (
    <AppModal open={open} onClose={onClose} title={t('log.title')}>
      <LogForm key={`${workout.id}-${open}`} workout={workout} prefill={prefill} onClose={onClose} />
    </AppModal>
  );
}

function LogForm({
  workout,
  prefill,
  onClose,
}: {
  workout: WorkoutsRow;
  prefill?: LogWorkoutPrefill;
  onClose: () => void;
}) {
  const { t } = useTranslation('workout');
  const logWorkout = useLogWorkout();
  const { data: shoes = [] } = useShoes();
  const activeShoes = shoes.filter((shoe) => !shoe.retired);
  const initialDistance = prefill ? (prefill.distanceKm ?? null) : workout.distance_km > 0 ? workout.distance_km : null;
  const [distance, setDistance] = useState(initialDistance ? String(initialDistance) : '');
  const [duration, setDuration] = useState(prefill?.durationSec ? formatDuration(prefill.durationSec) : '');
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState('');
  const [shoeId, setShoeId] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    let durationSec: number;
    try {
      durationSec = parseTimeToSeconds(duration.trim());
    } catch {
      setError(t('log.errorDuration'));
      return;
    }
    const parsed = runLogSchema.safeParse({
      distanceKm: Number(distance.replace(',', '.')),
      durationSec,
      rpe,
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      setError(t('log.errorInvalid'));
      return;
    }
    try {
      await logWorkout.mutateAsync({
        workout,
        ...parsed.data,
        shoeId: shoeId || null,
        source: prefill?.source ?? 'manual',
      });
      onClose();
    } catch {
      setError(t('log.errorSave'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <AppInput
          label={t('log.distance')}
          inputMode="decimal"
          value={distance}
          onChange={(event) => setDistance(event.target.value)}
        />
        <AppInput
          label={t('log.duration')}
          placeholder="49:30"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
      </div>
      <div>
        <label
          className="mb-1.5 flex items-center justify-between text-sm font-medium text-text-secondary"
          htmlFor="log-rpe"
        >
          <span>{t('log.rpe')}</span>
          <span className="text-primary-ink">{rpe}</span>
        </label>
        <input
          id="log-rpe"
          type="range"
          min={1}
          max={10}
          value={rpe}
          aria-valuetext={t('log.rpeValue', { rpe })}
          onChange={(event) => setRpe(Number(event.target.value))}
          className="w-full accent-primary"
        />
      </div>
      <AppTextarea
        label={t('log.notes')}
        placeholder={t('log.notesPlaceholder')}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      {activeShoes.length > 0 ? (
        <AppSelect
          data-testid="log-shoe"
          label={t('log.shoe')}
          value={shoeId}
          onChange={(event) => setShoeId(event.target.value)}
        >
          <option value="">{t('log.shoeNone')}</option>
          {activeShoes.map((shoe) => (
            <option key={shoe.id} value={shoe.id}>
              {shoe.name}
            </option>
          ))}
        </AppSelect>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink">{error}</p>
      ) : null}
      <div className="flex gap-3">
        <AppButton type="button" variant="secondary" className="flex-1" onClick={onClose}>
          {t('common:actions.cancel')}
        </AppButton>
        <AppButton type="button" className="flex-1" loading={logWorkout.isPending} onClick={() => void handleSubmit()}>
          {t('common:actions.save')}
        </AppButton>
      </div>
    </div>
  );
}
