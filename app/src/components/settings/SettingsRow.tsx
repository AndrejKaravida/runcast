import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

interface SettingsRowProps {
  to: string;
  icon: LucideIcon;
  label: string;
  subtitle?: string;
}

export function SettingsRow({ to, icon: Icon, label, subtitle }: SettingsRowProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60 active:scale-[0.99]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {subtitle ? <span className="block text-caption text-text-muted">{subtitle}</span> : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
    </Link>
  );
}
