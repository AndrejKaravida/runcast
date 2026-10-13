import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AppButton } from '@/components/ui/AppButton';

interface SettingsSubpageProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SettingsSubpage({ title, action, children }: SettingsSubpageProps) {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AppButton variant="ghost" size="sm" className="-ml-2 w-auto" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> {t('common:actions.back')}
        </AppButton>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-display">{title}</h1>
        {action}
      </div>

      <div className="space-y-6">{children}</div>
    </div>
  );
}
