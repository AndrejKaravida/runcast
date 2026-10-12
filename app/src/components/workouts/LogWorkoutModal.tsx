import { useState } from 'react';
import { formatDuration, parseTimeToSeconds, runLogSchema } from '@runcast/shared';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppModal } from '@/components/ui/AppModal';
import { AppTextarea } from '@/components/ui/AppTextarea';
import { useLogWorkout } from '@/features/logs/queries';
import type { WorkoutsRow } from '@/types';

interface LogWorkoutPrefill {
  distanceKm?: number;
  durationSec?: number;
}

interface LogWorkoutModalProps {
  workout: WorkoutsRow | null;
  open: boolean;
  onClose: () => void;
  prefill?: LogWorkoutPrefill;
}

export function LogWorkoutModal({ workout, open, onClose, prefill }: LogWorkoutModalProps) {
  if (!workout) return null;
  return (
    <AppModal open={open} onClose={onClose} title="Zabeleži trening">
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
  const logWorkout = useLogWorkout();
  const initialDistance = prefill?.distanceKm ?? (workout.distance_km ? workout.distance_km : null);
  const [distance, setDistance] = useState(initialDistance ? String(initialDistance) : '');
  const [duration, setDuration] = useState(prefill?.durationSec ? formatDuration(prefill.durationSec) : '');
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    let durationSec: number;
    try {
      durationSec = parseTimeToSeconds(duration.trim());
    } catch {
      setError('Trajanje unesi kao mm:ss ili h:mm:ss');
      return;
    }
    const parsed = runLogSchema.safeParse({
      distanceKm: Number(distance.replace(',', '.')),
      durationSec,
      rpe,
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      setError('Proveri distancu (km), trajanje i RPE');
      return;
    }
    try {
      await logWorkout.mutateAsync({ workout, ...parsed.data });
      onClose();
    } catch {
      setError('Čuvanje nije uspelo — pokušaj ponovo');
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <AppInput
          label="Distanca (km)"
          inputMode="decimal"
          value={distance}
          onChange={(event) => setDistance(event.target.value)}
        />
        <AppInput
          label="Trajanje (h:mm:ss)"
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
          <span>Težina (RPE)</span>
          <span className="text-primary">{rpe}</span>
        </label>
        <input
          id="log-rpe"
          type="range"
          min={1}
          max={10}
          value={rpe}
          aria-valuetext={`RPE ${rpe} od 10`}
          onChange={(event) => setRpe(Number(event.target.value))}
          className="w-full accent-primary"
        />
      </div>
      <AppTextarea
        label="Beleška (opciono)"
        placeholder="Kako je bilo?"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}
      <div className="flex gap-3">
        <AppButton type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Otkaži
        </AppButton>
        <AppButton type="button" className="flex-1" loading={logWorkout.isPending} onClick={() => void handleSubmit()}>
          Sačuvaj
        </AppButton>
      </div>
    </div>
  );
}
