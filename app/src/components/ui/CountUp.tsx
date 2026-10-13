import { animate, useMotionValue, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

function formatInteger(value: number): string {
  return String(Math.round(value));
}

interface CountUpProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}

export function CountUp({ value, format = formatInteger, duration = 0.6, className }: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(reduceMotion ? value : 0);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    if (reduceMotion) {
      motionValue.set(value);
      node.textContent = format(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });
    return () => controls.stop();
  }, [value, duration, format, reduceMotion, motionValue]);

  return (
    <span ref={nodeRef} className={className}>
      {format(reduceMotion ? value : 0)}
    </span>
  );
}
