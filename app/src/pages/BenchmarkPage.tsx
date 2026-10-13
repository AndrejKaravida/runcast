import { useState } from 'react';
import { BENCHMARK_DISTANCES_KM, formatDuration, parseTimeToSeconds } from '@runcast/shared';
import { ArrowLeft, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { BenchmarkSuggestionCard } from '@/components/benchmark/BenchmarkSuggestionCard';
import { useBenchmarkClock } from '@/components/benchmark/useBenchmarkClock';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useSaveBenchmarkLog } from '@/features/logs/queries';
import { planPaces } from '@/features/plans/plan-data';
import { useActivePlan } from '@/features/plans/queries';
import { dayDiff, todayIso } from '@/lib/dates';

type Stage = 'pick' | 'run' | 'result';

const INSTRUCTION_KEYS = ['warmup', 'effort', 'cooldown', 'hint'];

export function BenchmarkPage() {
  const { t } = useTranslation('benchmark');
  const navigate = useNavigate();
  const { data: plan } = useActivePlan();
  const saveLog = useSaveBenchmarkLog();
  const clock = useBenchmarkClock();
  const [stage, setStage] = useState<Stage>('pick');
  const [distanceKm, setDistanceKm] = useState<number>(BENCHMARK_DISTANCES_KM[0]);
  const [timeInput, setTimeInput] = useState('');
  const [distanceInput, setDistanceInput] = useState('');
  const [result, setResult] = useState<{ distanceKm: number; timeSec: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paces = planPaces(plan);
  const daysToRace = plan ? dayDiff(todayIso(), plan.race_date) : null;

  function handleStart() {
    clock.start();
    setStage('run');
  }

  function handleFinish() {
    const seconds = Math.max(1, Math.round(clock.finish()));
    setTimeInput(formatDuration(seconds));
    setDistanceInput(String(distanceKm));
    setError(null);
    setStage('result');
  }

  async function handleSave() {
    setError(null);
    let timeSec: number;
    try {
      timeSec = parseTimeToSeconds(timeInput.trim());
    } catch {
      setError(t('result.errorTime'));
      return;
    }
    const parsedDistance = Number(distanceInput.replace(',', '.'));
    if (!Number.isFinite(parsedDistance) || parsedDistance <= 0 || parsedDistance > 100) {
      setError(t('result.errorDistance'));
      return;
    }
    try {
      await saveLog.mutateAsync({ distanceKm: parsedDistance, durationSec: timeSec });
      setResult({ distanceKm: parsedDistance, timeSec });
    } catch {
      setError(t('result.errorSave'));
    }
  }

  const backButton = (
    <div className="flex items-center justify-between">
      <AppButton variant="ghost" size="sm" className="-ml-2 w-auto" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t('common:actions.back')}
      </AppButton>
    </div>
  );

  if (stage === 'run') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-6">
        {backButton}
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="section-label">{distanceKm} km</p>
          <p data-testid="benchmark-clock" className="num text-hero font-bold">
            {formatDuration(Math.floor(clock.elapsedSec))}
          </p>
          <div className="flex w-full max-w-sm gap-3">
            <AppButton
              variant="secondary"
              className="flex-1"
              onClick={() => (clock.phase === 'paused' ? clock.resume() : clock.pause())}
            >
              {clock.phase === 'paused' ? t('clock.resume') : t('clock.pause')}
            </AppButton>
            <AppButton data-testid="benchmark-finish" className="flex-1" onClick={handleFinish}>
              {t('clock.finish')}
            </AppButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-5 px-4 py-6">
      {backButton}

      <div className="space-y-2">
        <p className="section-label">{t('label')}</p>
        <h1 className="text-2xl font-semibold tracking-display">{t('title')}</h1>
        <p className="text-sm text-text-secondary">{t('description')}</p>
      </div>

      {stage === 'pick' ? (
        <>
          <AppCard className="space-y-3">
            <SectionHeader label={t('distance.label')} />
            <SegmentedControl
              value={distanceKm}
              onChange={setDistanceKm}
              options={[
                { value: BENCHMARK_DISTANCES_KM[0], label: t('distance.km5') },
                { value: BENCHMARK_DISTANCES_KM[1], label: t('distance.km10') },
              ]}
            />
          </AppCard>
          <AppCard className="space-y-2">
            <SectionHeader label={t('instructions.title')} />
            <ul className="space-y-1.5">
              {INSTRUCTION_KEYS.map((key) => (
                <li key={key} className="flex gap-2 text-sm text-text-secondary">
                  <span className="text-primary-ink" aria-hidden>
                    •
                  </span>
                  <span className="min-w-0 flex-1">{t(`instructions.${key}`)}</span>
                </li>
              ))}
            </ul>
          </AppCard>
          <AppButton data-testid="benchmark-start" className="w-full" onClick={handleStart}>
            <Play className="h-4 w-4" aria-hidden /> {t('start')}
          </AppButton>
        </>
      ) : result ? (
        <BenchmarkSuggestionCard
          distanceKm={result.distanceKm}
          timeSec={result.timeSec}
          paces={paces}
          daysToRace={daysToRace}
        />
      ) : (
        <AppCard className="space-y-4">
          <SectionHeader label={t('result.title')} />
          <AppInput
            label={t('result.time')}
            placeholder="25:00"
            value={timeInput}
            onChange={(event) => setTimeInput(event.target.value)}
          />
          <AppInput
            label={t('result.distance')}
            inputMode="decimal"
            value={distanceInput}
            onChange={(event) => setDistanceInput(event.target.value)}
          />
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink"
            >
              {error}
            </p>
          ) : null}
          <AppButton
            data-testid="benchmark-save"
            className="w-full"
            loading={saveLog.isPending}
            onClick={() => void handleSave()}
          >
            {t('result.save')}
          </AppButton>
        </AppCard>
      )}
    </div>
  );
}
