import { useReducedMotion, type MotionProps } from 'motion/react';

export function useTapProps(scale = 0.97): MotionProps {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return {};
  return {
    whileTap: { scale },
    transition: { type: 'spring', bounce: 0, duration: 0.25 },
  };
}
