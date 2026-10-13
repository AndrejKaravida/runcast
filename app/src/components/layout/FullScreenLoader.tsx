import clsx from 'clsx';
import { useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { RunnerMark } from '@/components/layout/RunnerMark';

export function FullScreenLoader() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center bg-bg">
      <RunnerMark className={clsx('h-16 w-16 text-text-muted', !reduceMotion && 'loader-mark--animated')} />
      <span className="sr-only">{t('loading')}</span>
    </div>
  );
}
