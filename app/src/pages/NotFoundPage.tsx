import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-3xl font-bold">404</p>
      <p className="text-sm text-text-secondary">Ova stranica ne postoji.</p>
      <Link className="text-sm font-medium text-primary-ink hover:text-primary-ink-hover" to="/today">
        Nazad na Danas
      </Link>
    </div>
  );
}
