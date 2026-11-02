import { useState, useCallback, useEffect } from 'react';

export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [sentinel, setSentinel] = useState<WakeLockSentinel | null>(null);

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      return { success: false, message: 'Screen Wake Lock API not supported in this browser.' };
    }

    try {
      if (sentinel) {
        await sentinel.release();
        setSentinel(null);
        setIsLocked(false);
        return { success: true, message: 'Screen Wake Lock deactivated.' };
      } else {
        const newSentinel = await navigator.wakeLock.request('screen');
        newSentinel.addEventListener('release', () => {
          setSentinel(null);
          setIsLocked(false);
        });
        setSentinel(newSentinel);
        setIsLocked(true);
        return { success: true, message: 'Screen Wake Lock active. Display will stay on.' };
      }
    } catch (err) {
      return { success: false, message: 'Wake Lock request failed or was dismissed.' };
    }
  }, [sentinel]);

  return { isLocked, isSupported, toggleWakeLock };
}
