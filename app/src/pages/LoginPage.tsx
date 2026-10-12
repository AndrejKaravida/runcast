import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CloudRain, Headphones, Route } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { supabase } from '@/lib/supabase';
import { authErrorMessage } from '@/lib/auth-errors';

const loginSchema = z.object({
  email: z.string().email('Unesi ispravan email'),
  password: z.string().min(8, 'Lozinka ima najmanje 8 znakova'),
});

type LoginValues = z.infer<typeof loginSchema>;

const VALUE_ROWS = [
  { icon: CloudRain, text: 'Plan koji sluša prognozu i pomera treninge' },
  { icon: Headphones, text: 'Vođeni treninzi sa tempom u realnom vremenu' },
  { icon: Route, text: 'Faze od baze do trke, bez lutanja' },
];

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
      <div className="mb-6 text-center">
        <p className="text-3xl font-bold tracking-display">
          Run<span className="text-primary-ink">Cast</span>
        </p>
        <p className="mt-2 text-sm text-text-secondary">Plan za maraton koji sluša vremensku prognozu.</p>
      </div>
      <ul className="mb-6 space-y-2">
        {VALUE_ROWS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2 text-sm text-text-secondary">
            <Icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
            {text}
          </li>
        ))}
      </ul>
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
          <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink">
            {serverError}
          </p>
        ) : null}
        <AppButton type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          Prijavi se
        </AppButton>
      </form>
      <Link to="/register" className="mt-3">
        <AppButton variant="secondary" size="lg" className="w-full">
          Napravi nalog
        </AppButton>
      </Link>
      <Link className="mt-4 text-center text-sm text-text-secondary hover:text-text" to="/forgot-password">
        Zaboravljena lozinka?
      </Link>
    </div>
  );
}
