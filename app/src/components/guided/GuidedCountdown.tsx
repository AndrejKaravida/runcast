import { useTranslation } from 'react-i18next';
import { CueBanner } from '@/components/guided/CueBanner';

interface GuidedCountdownProps {
  countdownValue: number;
  bannerText: string;
}

export function GuidedCountdown({ countdownValue, bannerText }: GuidedCountdownProps) {
  const { t } = useTranslation('guided');
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col items-center justify-center gap-4 px-4 py-6">
      <p className="section-label">{t('countdown.label')}</p>
      <p
        key={countdownValue}
        data-testid="guided-countdown"
        className="num value-swap text-hero font-bold text-primary-ink"
      >
        {countdownValue}
      </p>
      <CueBanner text={bannerText} />
    </div>
  );
}
