import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { supabase } from '@/lib/supabase';
import { authErrorMessage } from '@/lib/auth-errors';

const loginSchema = z.object({
  email: z.string().email('Unesi ispravan email'),
  password: z.string().min(8, 'Lozinka ima najmanje 8 znakova'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setServerError(authErrorMessage(error.message));
      return;
    }
    navigate('/today', { replace: true });
  });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-2xl font-bold tracking-tight">
          Run<span className="text-primary">Cast</span>
        </p>
        <p className="mt-2 text-sm text-text-secondary">Plan za maraton koji sluša vremensku prognozu.</p>
      </div>
      <AppCard className="p-5">
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <AppInput
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="ti@primer.com"
            error={formState.errors.email?.message}
            {...register('email')}
          />
          <AppInput
            label="Lozinka"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={formState.errors.password?.message}
            {...register('password')}
          />
          {serverError ? (
            <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          ) : null}
          <AppButton type="submit" className="w-full" loading={formState.isSubmitting}>
            Prijavi se
          </AppButton>
        </form>
      </AppCard>
      <div className="mt-4 flex items-center justify-between text-sm">
        <Link className="text-text-secondary hover:text-text" to="/forgot-password">
          Zaboravljena lozinka?
        </Link>
        <Link className="font-medium text-primary hover:text-primary-pressed" to="/register">
          Napravi nalog
        </Link>
      </div>
    </div>
  );
}
