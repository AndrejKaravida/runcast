import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthProvider';
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

const resetSchema = z
  .object({
    password: z.string().min(8, 'Lozinka ima najmanje 8 znakova'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, { message: 'Lozinke se ne poklapaju', path: ['confirm'] });

type ResetValues = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setServerError(authErrorMessage(error.message));
      return;
    }
    navigate('/today', { replace: true });
  });

  if (loading) return <FullScreenLoader />;

  if (!session) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-4 py-10">
        <div className="space-y-2 text-center">
          <p className="text-2xl font-semibold tracking-display">Link nije važeći</p>
          <p className="text-sm text-text-secondary">Link za reset je istekao ili je već iskorišćen.</p>
        </div>
        <Link to="/forgot-password" className="mt-6">
          <AppButton variant="secondary" size="lg" className="w-full">
            Zatraži novi link
          </AppButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-display">Nova lozinka</h1>
      <form className="mt-4 space-y-4" onSubmit={onSubmit} noValidate>
        <AppInput
          label="Nova lozinka"
          type="password"
          autoComplete="new-password"
          error={formState.errors.password?.message}
          {...register('password')}
        />
        <AppInput
          label="Potvrdi lozinku"
          type="password"
          autoComplete="new-password"
          error={formState.errors.confirm?.message}
          {...register('confirm')}
        />
        {serverError ? (
          <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink">
            {serverError}
          </p>
        ) : null}
        <AppButton type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          Sačuvaj lozinku
        </AppButton>
      </form>
    </div>
  );
}
