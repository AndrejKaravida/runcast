import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

function registerSchema(t: TFunction<'auth'>) {
  return z
    .object({
      displayName: z.string().min(2, t('validation.nameMin')).max(80),
      email: z.string().email(t('validation.email')),
      password: z.string().min(8, t('validation.passwordMin')),
      confirm: z.string(),
    })
    .refine((values) => values.password === values.confirm, {
      message: t('validation.passwordMismatch'),
      path: ['confirm'],
    });
}

type RegisterValues = z.infer<ReturnType<typeof registerSchema>>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { register, handleSubmit, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema(t)),
  });

  const onSubmit = handleSubmit(async ({ displayName, email, password }) => {
    setServerError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) {
      setServerError(t(authErrorMessage(error.message, error.code)));
      return;
    }
    if (data.session) {
      navigate('/onboarding', { replace: true });
      return;
    }
    setConfirmationSent(true);
  });

  if (confirmationSent) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-4 py-10">
        <div className="space-y-2 text-center">
          <p className="text-2xl font-semibold tracking-display">{t('register.confirmationTitle')}</p>
          <p className="text-sm text-text-secondary">{t('register.confirmationText')}</p>
        </div>
        <Link to="/login" className="mt-6">
          <AppButton variant="secondary" size="lg" className="w-full">
            {t('backToLogin')}
          </AppButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-3xl font-bold tracking-display">
          Run<span className="text-primary-ink">Cast</span>
        </p>
        <p className="mt-2 text-sm text-text-secondary">{t('register.tagline')}</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <AppInput
          label={t('fields.name')}
          autoComplete="name"
          placeholder={t('register.namePlaceholder')}
          error={formState.errors.displayName?.message}
          {...register('displayName')}
        />
        <AppInput
          label={t('fields.email')}
          type="email"
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
          error={formState.errors.email?.message}
          {...register('email')}
        />
        <AppInput
          label={t('fields.password')}
          type="password"
          autoComplete="new-password"
          placeholder={t('register.passwordPlaceholder')}
          error={formState.errors.password?.message}
          {...register('password')}
        />
        <AppInput
          label={t('fields.confirm')}
          type="password"
          autoComplete="new-password"
          placeholder={t('register.confirmPlaceholder')}
          error={formState.errors.confirm?.message}
          {...register('confirm')}
        />
        {serverError ? (
          <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink">
            {serverError}
          </p>
        ) : null}
        <AppButton type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          {t('register.submit')}
        </AppButton>
      </form>
      <p className="mt-4 text-center text-sm text-text-secondary">
        {t('register.haveAccount')}{' '}
        <Link className="font-medium text-primary-ink hover:text-primary-ink-hover" to="/login">
          {t('login.submit')}
        </Link>
      </p>
    </div>
  );
}
