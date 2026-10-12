import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  valueClassName?: string;
  className?: string;
}

export function StatTile({ label, value, icon, valueClassName, className }: StatTileProps) {
  return (
    <div className={clsx('flex min-w-0 flex-col gap-1 rounded-xl bg-surface-elevated px-3 py-2.5', className)}>
      <p className="section-label flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className={clsx('num truncate text-stat font-semibold', valueClassName)}>{value}</p>
    </div>
  );
}
