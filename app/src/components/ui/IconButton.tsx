import { clsx } from 'clsx';
import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { useTapProps } from '@/lib/motion';

interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  label: string;
  children?: ReactNode;
}

export function IconButton({ label, children, className, ...rest }: IconButtonProps) {
  const tapProps = useTapProps(0.9);
  return (
    <motion.button
      type="button"
      aria-label={label}
      className={clsx(
        'inline-flex h-11 w-11 select-none items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        className,
      )}
      {...tapProps}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
