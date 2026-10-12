import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface ListRowProps {
  to?: string;
  testId?: string;
  eyebrow?: string;
  title: ReactNode;
  meta?: ReactNode;
  value?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function ListRow({ to, testId, eyebrow, title, meta, value, icon, className }: ListRowProps) {
  const classes = clsx(
    'flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3',
    to &&
      'transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99]',
    className,
  );
  const body = (
    <>
      {icon ? <span className="shrink-0 text-text-muted">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="section-label">{eyebrow}</p> : null}
        <p className="truncate text-sm font-medium">{title}</p>
        {meta ? <p className="text-caption text-text-muted">{meta}</p> : null}
      </div>
      {value ? (
        <span className="num flex shrink-0 items-center gap-1 text-sm text-text-secondary">
          {value}
          {to ? <ChevronRight className="h-4 w-4" aria-hidden /> : null}
        </span>
      ) : to ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
      ) : null}
    </>
  );
  if (to) {
    return (
      <Link to={to} data-testid={testId} className={classes}>
        {body}
      </Link>
    );
  }
  return (
    <div data-testid={testId} className={classes}>
      {body}
    </div>
  );
}
