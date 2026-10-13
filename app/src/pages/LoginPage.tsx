import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TFunction } from 'i18next';
import { CloudRain, Headphones, Route } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

function loginSchema(t: TFunction<'auth'>) {
  return z.object({
    email: z.string().email(t('validation.email')),
    password: z.string().min(8, t('validation.passwordMin')),
  });
}

type LoginValues = z.infer<ReturnType<typeof loginSchema>>;

const VALUE_ROWS = [
  { icon: CloudRain, labelKey: 'login.valueWeather' },
  { icon: Headphones, labelKey: 'login.valueGuided' },
  { icon: Route, labelKey: 'login.valuePhases' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema(t)),
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setServerError(t(authErrorMessage(error.message, error.code)));
      return;
    }
    navigate('/today', { replace: true });
  });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-3xl font-bold tracking-display">
          Run<span className="text-primary-ink">Cast</span>
        </p>
        <p className="mt-2 text-sm text-text-secondary">{t('login.tagline')}</p>
      </div>
      <ul className="mb-6 space-y-2">
        {VALUE_ROWS.map(({ icon: Icon, labelKey }) => (
          <li key={labelKey} className="flex items-center gap-2 text-sm text-text-secondary">
            <Icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
            {t(labelKey)}
          </li>
        ))}
      </ul>
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
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
          autoComplete="current-password"
          placeholder="••••••••"
          error={formState.errors.password?.message}
          {...register('password')}
        />
        {serverError ? (
          <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink">
            {serverError}
          </p>
        ) : null}
        <AppButton type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          {t('login.submit')}
        </AppButton>
      </form>
      <Link to="/register" className="mt-3">
        <AppButton variant="secondary" size="lg" className="w-full">
          {t('login.register')}
        </AppButton>
      </Link>
      <Link className="mt-4 text-center text-sm text-text-secondary hover:text-text" to="/forgot-password">
        {t('login.forgot')}
      </Link>
      <p className="mt-6 flex items-center justify-center gap-2 text-caption text-text-muted">
        <Link to="/privacy" className="hover:text-text">
          {t('login.privacy')}
        </Link>
        <span aria-hidden>·</span>
        <Link to="/terms" className="hover:text-text">
          {t('login.terms')}
        </Link>
      </p>
    </div>
  );
}
