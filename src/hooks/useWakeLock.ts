import { useState, useCallback, useEffect, useRef } from 'react';

export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const wantLockRef = useRef(false);

  const acquireLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || sentinelRef.current) return false;
    try {
      const newSentinel = await navigator.wakeLock.request('screen');
      newSentinel.addEventListener('release', () => {
        sentinelRef.current = null;
        setIsLocked(false);
      });
      sentinelRef.current = newSentinel;
      setIsLocked(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);

    // Re-acquire screen wake lock automatically when returning to the tab if user enabled it
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wantLockRef.current) {
        acquireLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [acquireLock]);

  const toggleWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      return { success: false, message: 'Screen Wake Lock API not supported in this browser.' };
    }

    if (wantLockRef.current || sentinelRef.current) {
      wantLockRef.current = false;
      try {
        await sentinelRef.current?.release();
      } catch {
        // Ignore release errors
      }
      sentinelRef.current = null;
      setIsLocked(false);
      return { success: true, message: 'Screen Wake Lock deactivated.' };
    } else {
      wantLockRef.current = true;
      const ok = await acquireLock();
      if (ok) {
        return { success: true, message: 'Screen Wake Lock active. Display will stay on.' };
      }
      wantLockRef.current = false;
      return { success: false, message: 'Wake Lock request failed or was dismissed.' };
    }
  }, [acquireLock]);

  return { isLocked, isSupported, toggleWakeLock };
}
