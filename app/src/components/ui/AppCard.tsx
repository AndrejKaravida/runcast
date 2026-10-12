import { clsx } from 'clsx';
import type { ComponentProps } from 'react';

export function AppCard({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={clsx('rounded-2xl border border-border bg-surface p-4', className)} {...rest} />;
}
