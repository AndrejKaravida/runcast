import { clsx } from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-accent hover:bg-primary-pressed',
  secondary: 'border border-border bg-surface-elevated text-text hover:bg-surface',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface hover:text-text',
  danger: 'border border-danger/40 bg-danger-soft text-danger-ink hover:bg-danger/20',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

const BASE_CLASSES =
  'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50';

export function buttonClassName(variant: ButtonVariant, size: ButtonSize, className?: string): string {
  return clsx(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);
}
