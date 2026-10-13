import { useReducedMotion, type MotionProps } from 'motion/react';

export function useTapProps(scale = 0.97): MotionProps {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return {};
  return {
    whileTap: { scale },
    transition: { type: 'spring', bounce: 0, duration: 0.25 },
  };
}

export function staggerProps(index: number, reduceMotion: boolean | null): MotionProps {
  if (reduceMotion) return {};
  return {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease: 'easeOut', delay: Math.min(index, 5) * 0.03 },
  };
}
