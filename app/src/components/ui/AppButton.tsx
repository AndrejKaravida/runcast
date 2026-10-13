import { Loader2 } from 'lucide-react';
import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { buttonClassName, type ButtonSize, type ButtonVariant } from '@/components/ui/button-styles';
import { useTapProps } from '@/lib/motion';

interface AppButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
}

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
      className={buttonClassName(variant, size, className)}
      disabled={disabled || loading}
      {...tapProps}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </motion.button>
  );
}
