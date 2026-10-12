import { useEffect, useRef, useState } from 'react';

export type GeoStatus = 'idle' | 'tracking' | 'denied' | 'unsupported';

const MAX_ACCURACY_M = 50;
const MIN_STEP_M = 5;
const EARTH_RADIUS_M = 6371000;

function haversineMeters(a: GeolocationPosition, b: GeolocationPosition): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.coords.latitude - a.coords.latitude);
  const dLon = toRad(b.coords.longitude - a.coords.longitude);
  const lat1 = toRad(a.coords.latitude);
  const lat2 = toRad(b.coords.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(h));
}

export function useGeoDistance(enabled: boolean): { distanceKm: number; status: GeoStatus } {
  const [distanceKm, setDistanceKm] = useState(0);
  const [watchStatus, setWatchStatus] = useState<GeoStatus>('tracking');
  const totalRef = useRef(0);
  const lastRef = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    if (!enabled || !('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setWatchStatus('tracking');
        if (position.coords.accuracy > MAX_ACCURACY_M) return;
        const previous = lastRef.current;
        lastRef.current = position;
        if (!previous) return;
        const meters = haversineMeters(previous, position);
        if (meters < MIN_STEP_M) return;
        totalRef.current += meters;
        setDistanceKm(Math.round((totalRef.current / 1000) * 100) / 100);
      },
      () => setWatchStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  const status: GeoStatus = !enabled ? 'idle' : !('geolocation' in navigator) ? 'unsupported' : watchStatus;

  return { distanceKm, status };
}
