import { useCallback, useEffect, useRef, useState } from 'react';

export type BenchmarkPhase = 'idle' | 'running' | 'paused' | 'finished';

const TICK_MS = 250;

export interface BenchmarkClock {
  phase: BenchmarkPhase;
  elapsedSec: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  finish: () => number;
}

export function useBenchmarkClock(): BenchmarkClock {
  const [phase, setPhase] = useState<BenchmarkPhase>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const phaseRef = useRef<BenchmarkPhase>('idle');
  const baseRef = useRef(0);
  const anchorRef = useRef(0);

  const transition = useCallback((next: BenchmarkPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const elapsedAt = useCallback((now: number) => anchorRef.current + (now - baseRef.current) / 1000, []);

  const sync = useCallback(() => {
    if (phaseRef.current !== 'running') return;
    setElapsedSec(elapsedAt(performance.now()));
  }, [elapsedAt]);

  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(sync, TICK_MS);
    return () => window.clearInterval(id);
  }, [phase, sync]);

  useEffect(() => {
    const handle = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [sync]);

  const start = useCallback(() => {
    baseRef.current = performance.now();
    anchorRef.current = 0;
    setElapsedSec(0);
    transition('running');
  }, [transition]);

  const pause = useCallback(() => {
    if (phaseRef.current !== 'running') return;
    anchorRef.current = elapsedAt(performance.now());
    setElapsedSec(anchorRef.current);
    transition('paused');
  }, [elapsedAt, transition]);

  const resume = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    baseRef.current = performance.now();
    transition('running');
  }, [transition]);

  const finish = useCallback(() => {
    const final = phaseRef.current === 'running' ? elapsedAt(performance.now()) : anchorRef.current;
    anchorRef.current = final;
    setElapsedSec(final);
    transition('finished');
    return final;
  }, [elapsedAt, transition]);

  return { phase, elapsedSec, start, pause, resume, finish };
}
