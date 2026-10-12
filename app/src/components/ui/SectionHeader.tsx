import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface SectionHeaderProps {
  label: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ label, action, className }: SectionHeaderProps) {
  return (
    <div className={clsx('flex items-center justify-between gap-2', className)}>
      <p className="section-label">{label}</p>
      {action}
    </div>
  );
}
