import { useEffect, useRef, useState } from 'react';

export function useWakeLock(active: boolean): boolean {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const [supported] = useState(() => 'wakeLock' in navigator);

  useEffect(() => {
    if (!active || !supported) return;
    let cancelled = false;

    const request = () => {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (cancelled) {
            sentinel.release().catch(() => {});
            return;
          }
          sentinelRef.current = sentinel;
        })
        .catch(() => {});
    };

    request();
    const handle = () => {
      if (document.visibilityState === 'visible') request();
    };
    document.addEventListener('visibilitychange', handle);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handle);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) sentinel.release().catch(() => {});
    };
  }, [active, supported]);

  return supported;
}
