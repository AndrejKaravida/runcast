import { useCallback, useEffect, useRef, useState } from 'react';
import {
  haversineMeters,
  initialLiveTrack,
  isFixUsable,
  isGpsLost,
  reduceLiveTrack,
  resetLiveTrackAnchor,
  shouldAutoPause,
  shouldAutoResume,
  LIVE_MAX_SPEED_MPS,
  LIVE_PAUSE_SPEED_MPS,
  type LiveSplit,
  type LiveTrackState,
  type TrackFix,
} from '@runcast/shared';

export type GeoStatus = 'idle' | 'tracking' | 'denied' | 'unsupported';

export interface LiveTrack {
  distanceM: number;
  distanceKm: number;
  splits: LiveSplit[];
  paceEmaSecPerKm: number | null;
  gpsLost: boolean;
  status: GeoStatus;
  resetAutoPause: () => void;
}

interface LiveTrackOptions {
  enabled: boolean;
  running: boolean;
  onAutoPause: () => void;
  onAutoResume: () => void;
}

const PERMISSION_DENIED_CODE = 1;
const TRACKER_TICK_MS = 1000;

function toFix(position: GeolocationPosition): TrackFix {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyM: position.coords.accuracy,
    timestampMs: position.timestamp,
  };
}

export function useLiveTrack({ enabled, running, onAutoPause, onAutoResume }: LiveTrackOptions): LiveTrack {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const [state, setState] = useState<LiveTrackState>(initialLiveTrack);
  const [status, setStatus] = useState<GeoStatus>('tracking');
  const [gpsLost, setGpsLost] = useState(false);
  const stateRef = useRef(state);
  const runningRef = useRef(running);
  const lostRef = useRef(false);
  const latestFixRef = useRef<TrackFix | null>(null);
  const lastFixAtRef = useRef<number | null>(null);
  const lastMovingAtRef = useRef(0);
  const autoPausedRef = useRef(false);
  const pauseAnchorRef = useRef<TrackFix | null>(null);
  const pauseMovedRef = useRef(0);
  const handlersRef = useRef({ onAutoPause, onAutoResume });

  const applyState = useCallback((next: LiveTrackState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    handlersRef.current = { onAutoPause, onAutoResume };
  }, [onAutoPause, onAutoResume]);

  useEffect(() => {
    runningRef.current = running;
    if (!running) return;
    lastMovingAtRef.current = Date.now();
    autoPausedRef.current = false;
    pauseAnchorRef.current = null;
    pauseMovedRef.current = 0;
    const latest = latestFixRef.current;
    if (latest) applyState(resetLiveTrackAnchor(stateRef.current, latest));
  }, [running, applyState]);

  useEffect(() => {
    if (!enabled || !supported) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setStatus('tracking');
        const now = Date.now();
        const fix = toFix(position);
        if (!isFixUsable(fix, now)) return;
        lastFixAtRef.current = now;
        latestFixRef.current = fix;
        if (lostRef.current) {
          lostRef.current = false;
          setGpsLost(false);
        }
        if (runningRef.current) {
          const next = reduceLiveTrack(stateRef.current, fix, now);
          if (next !== stateRef.current) {
            applyState(next);
            if (next.speedMps >= LIVE_PAUSE_SPEED_MPS) lastMovingAtRef.current = now;
          }
          return;
        }
        if (!autoPausedRef.current) return;
        const anchor = pauseAnchorRef.current ?? fix;
        const dtSec = (fix.timestampMs - anchor.timestampMs) / 1000;
        const stepM = haversineMeters(anchor, fix);
        const speedMps = dtSec > 0 ? stepM / dtSec : 0;
        pauseAnchorRef.current = fix;
        if (dtSec > 0 && speedMps <= LIVE_MAX_SPEED_MPS && stepM >= fix.accuracyM / 2) {
          pauseMovedRef.current += stepM;
        }
        if (shouldAutoResume(pauseMovedRef.current, speedMps)) {
          autoPausedRef.current = false;
          pauseAnchorRef.current = null;
          pauseMovedRef.current = 0;
          applyState(resetLiveTrackAnchor(stateRef.current, fix));
          handlersRef.current.onAutoResume();
        }
      },
      (error) => {
        if (error.code === PERMISSION_DENIED_CODE) {
          setStatus('denied');
          return;
        }
        lostRef.current = true;
        setGpsLost(true);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      lostRef.current = false;
      autoPausedRef.current = false;
      pauseAnchorRef.current = null;
      pauseMovedRef.current = 0;
      lastFixAtRef.current = null;
      latestFixRef.current = null;
      setGpsLost(false);
    };
  }, [enabled, supported, applyState]);

  useEffect(() => {
    if (!enabled || !running || !supported) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      if (!lostRef.current && isGpsLost(lastFixAtRef.current, now)) {
        lostRef.current = true;
        setGpsLost(true);
        return;
      }
      if (lostRef.current || lastFixAtRef.current === null || !runningRef.current) return;
      if (shouldAutoPause(lastMovingAtRef.current, now)) {
        autoPausedRef.current = true;
        pauseAnchorRef.current = latestFixRef.current;
        pauseMovedRef.current = 0;
        handlersRef.current.onAutoPause();
      }
    }, TRACKER_TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled, running, supported]);

  const resetAutoPause = useCallback(() => {
    autoPausedRef.current = false;
    pauseAnchorRef.current = null;
    pauseMovedRef.current = 0;
  }, []);

  const effectiveStatus: GeoStatus = !supported ? 'unsupported' : !enabled && status === 'tracking' ? 'idle' : status;

  return {
    distanceM: state.distanceM,
    distanceKm: Math.round((state.distanceM / 1000) * 100) / 100,
    splits: state.splits,
    paceEmaSecPerKm: state.paceEmaSecPerKm,
    gpsLost: effectiveStatus === 'tracking' && gpsLost,
    status: effectiveStatus,
    resetAutoPause,
  };
}
