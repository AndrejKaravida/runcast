import { formatDuration } from '@runcast/shared';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CueBanner } from '@/components/guided/CueBanner';
import { formatKm } from '@/components/guided/format';
import { AppButton } from '@/components/ui/AppButton';
import { StatRow } from '@/components/ui/StatRow';
import { LogWorkoutModal } from '@/components/workouts/LogWorkoutModal';
import type { RunLogsRow, WorkoutsRow } from '@/types';

interface GuidedFinishProps {
  workout: WorkoutsRow;
  elapsedSec: number;
  loggedDistanceKm: number | null;
  loggedDuration: number;
  gpsEnabled: boolean;
  gpsWithoutFix: boolean;
  bannerText: string;
  existingLog: RunLogsRow | null;
  onView: () => void;
}

export function GuidedFinish({
  workout,
  elapsedSec,
  loggedDistanceKm,
  loggedDuration,
  gpsEnabled,
  gpsWithoutFix,
  bannerText,
  existingLog,
  onView,
}: GuidedFinishProps) {
  const { t } = useTranslation();
  const [logOpen, setLogOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-success-ink" aria-hidden />
        <h1 className="text-2xl font-semibold">{t('guided:finish.title')}</h1>
        <StatRow
          items={[
            { label: t('guided:finish.time'), value: formatDuration(Math.round(elapsedSec)) },
            {
              label: t('guided:stats.distance'),
              value: loggedDistanceKm !== null ? `${formatKm(loggedDistanceKm)} km` : '—',
            },
            {
              label: t('guided:finish.source'),
              value: gpsEnabled ? t('guided:finish.sourceGps') : t('guided:finish.sourcePlan'),
            },
          ]}
          className="w-full max-w-sm rounded-xl bg-surface-elevated py-1"
        />
        {gpsWithoutFix ? <p className="text-caption text-warning-ink">{t('guided:finish.noFixHint')}</p> : null}
        <CueBanner text={bannerText} />
        {existingLog ? (
          <p className="text-sm text-text-secondary">{t('guided:finish.logged')}</p>
        ) : (
          <AppButton data-testid="guided-log" className="w-full max-w-sm" onClick={() => setLogOpen(true)}>
            {t('workout:log.title')}
          </AppButton>
        )}
        <AppButton variant="secondary" className="w-full max-w-sm" onClick={onView}>
          {t('guided:finish.view')}
        </AppButton>
      </div>
      <LogWorkoutModal
        workout={workout}
        open={logOpen}
        onClose={() => setLogOpen(false)}
        prefill={{ distanceKm: loggedDistanceKm ?? undefined, durationSec: loggedDuration }}
      />
    </div>
  );
}
