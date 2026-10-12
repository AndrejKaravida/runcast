import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

const registerSchema = z
  .object({
    displayName: z.string().min(2, 'Ime ima najmanje 2 znaka').max(80),
    email: z.string().email('Unesi ispravan email'),
    password: z.string().min(8, 'Lozinka ima najmanje 8 znakova'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, { message: 'Lozinke se ne poklapaju', path: ['confirm'] });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { register, handleSubmit, formState } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async ({ displayName, email, password }) => {
    setServerError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) {
      setServerError(authErrorMessage(error.message));
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
        <AppCard className="p-5 text-center">
          <p className="font-semibold">Proveri svoj email</p>
          <p className="mt-2 text-sm text-text-secondary">
            Poslali smo ti link za potvrdu naloga. Klikni na njega pa se prijavi.
          </p>
          <Link className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary-pressed" to="/login">
            Nazad na prijavu
          </Link>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-2xl font-bold tracking-tight">
          Run<span className="text-primary">Cast</span>
        </p>
        <p className="mt-2 text-sm text-text-secondary">Napravi nalog i dobij plan spreman za kišne dane.</p>
      </div>
      <AppCard className="p-5">
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <AppInput
            label="Ime"
            autoComplete="name"
            placeholder="Kako da te zovemo"
            error={formState.errors.displayName?.message}
            {...register('displayName')}
          />
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
            autoComplete="new-password"
            placeholder="Najmanje 8 znakova"
            error={formState.errors.password?.message}
            {...register('password')}
          />
          <AppInput
            label="Potvrdi lozinku"
            type="password"
            autoComplete="new-password"
            placeholder="Ponovi lozinku"
            error={formState.errors.confirm?.message}
            {...register('confirm')}
          />
          {serverError ? (
            <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          ) : null}
          <AppButton type="submit" className="w-full" loading={formState.isSubmitting}>
            Napravi nalog
          </AppButton>
        </form>
      </AppCard>
      <p className="mt-4 text-center text-sm text-text-secondary">
        Već imaš nalog?{' '}
        <Link className="font-medium text-primary hover:text-primary-pressed" to="/login">
          Prijavi se
        </Link>
      </p>
    </div>
  );
}
