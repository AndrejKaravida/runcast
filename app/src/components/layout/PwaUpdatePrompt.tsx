import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AppButton } from '@/components/ui/AppButton';
import { IconButton } from '@/components/ui/IconButton';

export function PwaUpdatePrompt() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
      <AnimatePresence>
        {needRefresh ? (
          <motion.div
            role="status"
            aria-live="polite"
            data-testid="pwa-update-prompt"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card"
          >
            <p className="min-w-0 flex-1 text-sm font-medium">{t('common:pwa.updateAvailable')}</p>
            <AppButton size="sm" onClick={() => void updateServiceWorker(true)}>
              {t('common:pwa.refresh')}
            </AppButton>
            <IconButton
              label={t('common:actions.close')}
              onClick={() => setNeedRefresh(false)}
              className="-mr-1 h-9 w-9"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
