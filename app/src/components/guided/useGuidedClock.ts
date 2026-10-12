import { useCallback, useEffect, useRef, useState } from 'react';

export type GuidedPhase = 'idle' | 'countdown' | 'running' | 'paused' | 'finished';

const COUNTDOWN_SEC = 3;
const TICK_MS = 250;

export interface GuidedClock {
  phase: GuidedPhase;
  elapsedSec: number;
  countdownValue: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  seekTo: (elapsedSec: number) => void;
}

export function useGuidedClock(totalDurationSec: number, timeScale: number): GuidedClock {
  const [phase, setPhase] = useState<GuidedPhase>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_SEC);
  const phaseRef = useRef<GuidedPhase>('idle');
  const baseRef = useRef(0);
  const anchorRef = useRef(0);
  const countdownStartRef = useRef(0);

  const transition = useCallback((next: GuidedPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const elapsedAt = useCallback(
    (now: number) => {
      return anchorRef.current + ((now - baseRef.current) * timeScale) / 1000;
    },
    [timeScale],
  );

  const sync = useCallback(() => {
    const now = performance.now();
    if (phaseRef.current === 'countdown') {
      const passed = ((now - countdownStartRef.current) * timeScale) / 1000;
      if (passed < COUNTDOWN_SEC) {
        setCountdownValue(Math.max(1, Math.ceil(COUNTDOWN_SEC - passed)));
        return;
      }
      baseRef.current = now;
      anchorRef.current = 0;
      setCountdownValue(COUNTDOWN_SEC);
      setElapsedSec(0);
      transition('running');
      return;
    }
    if (phaseRef.current !== 'running') return;
    const next = elapsedAt(now);
    if (totalDurationSec > 0 && next >= totalDurationSec) {
      anchorRef.current = totalDurationSec;
      setElapsedSec(totalDurationSec);
      transition('finished');
      return;
    }
    setElapsedSec(next);
  }, [elapsedAt, timeScale, totalDurationSec, transition]);

  useEffect(() => {
    if (phase !== 'running' && phase !== 'countdown') return;
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
    countdownStartRef.current = performance.now();
    anchorRef.current = 0;
    setCountdownValue(COUNTDOWN_SEC);
    setElapsedSec(0);
    transition('countdown');
  }, [transition]);

  const pause = useCallback(() => {
    if (phaseRef.current !== 'running') return;
    anchorRef.current = elapsedAt(performance.now());
    baseRef.current = performance.now();
    setElapsedSec(anchorRef.current);
    transition('paused');
  }, [elapsedAt, transition]);

  const resume = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    baseRef.current = performance.now();
    transition('running');
  }, [transition]);

  const finish = useCallback(() => {
    if (phaseRef.current === 'running') {
      const next = elapsedAt(performance.now());
      anchorRef.current = totalDurationSec > 0 ? Math.min(next, totalDurationSec) : next;
      setElapsedSec(anchorRef.current);
    }
    if (phaseRef.current === 'countdown' || phaseRef.current === 'idle') {
      anchorRef.current = 0;
      setElapsedSec(0);
    }
    transition('finished');
  }, [elapsedAt, totalDurationSec, transition]);

  const seekTo = useCallback(
    (target: number) => {
      const clamped = Math.max(0, totalDurationSec > 0 ? Math.min(target, totalDurationSec) : target);
      anchorRef.current = clamped;
      baseRef.current = performance.now();
      setElapsedSec(clamped);
    },
    [totalDurationSec],
  );

  return { phase, elapsedSec, countdownValue, start, pause, resume, finish, seekTo };
}
