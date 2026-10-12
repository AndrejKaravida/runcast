import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { useTapProps } from '@/lib/motion';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface AppButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-bg hover:bg-primary-pressed',
  secondary: 'border border-border bg-surface-elevated text-text hover:bg-surface',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface hover:text-text',
  danger: 'border border-danger/40 bg-danger-soft text-danger hover:bg-danger/20',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export function AppButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  children,
  ...rest
}: AppButtonProps) {
  const tapProps = useTapProps();
  return (
    <motion.button
      className={clsx(
        'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || loading}
      {...tapProps}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </motion.button>
  );
}
