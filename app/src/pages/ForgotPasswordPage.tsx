import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { z } from 'zod';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

function forgotSchema(t: TFunction<'auth'>) {
  return z.object({
    email: z.string().email(t('validation.email')),
  });
}

type ForgotValues = z.infer<ReturnType<typeof forgotSchema>>;

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema(t)),
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setServerError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setServerError(t(authErrorMessage(error.message, error.code)));
      return;
    }
    setSent(true);
  });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-4 py-10">
      {sent ? (
        <div className="space-y-2 text-center">
          <p className="text-2xl font-semibold tracking-display">{t('forgot.sentTitle')}</p>
          <p className="text-sm text-text-secondary">{t('forgot.sentText')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-display">{t('forgot.title')}</h1>
            <p className="mt-1 text-sm text-text-secondary">{t('forgot.description')}</p>
          </div>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <AppInput
              label={t('fields.email')}
              type="email"
              autoComplete="email"
              placeholder={t('emailPlaceholder')}
              error={formState.errors.email?.message}
              {...register('email')}
            />
            {serverError ? (
              <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink">
                {serverError}
              </p>
            ) : null}
            <AppButton type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
              {t('forgot.submit')}
            </AppButton>
          </form>
        </div>
      )}
      <Link to="/login" className="mt-4">
        <AppButton variant="ghost" size="sm" className="w-full">
          {t('backToLogin')}
        </AppButton>
      </Link>
    </div>
  );
}
