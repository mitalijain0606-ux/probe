import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook for periodic dashboard polling (10-15s).
 *
 * @param {Function} callback - Async function to execute on each interval
 * @param {number} intervalMs - Polling interval in ms (default: 12000ms / 12s)
 * @param {boolean} defaultEnabled - Initial polling state
 */
export function usePolling(callback, intervalMs = 12000, defaultEnabled = true) {
  const [isPolling, setIsPolling] = useState(defaultEnabled);
  const [lastPolledAt, setLastPolledAt] = useState(null);
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const executeTick = useCallback(async () => {
    try {
      if (savedCallback.current) {
        await savedCallback.current();
        setLastPolledAt(new Date());
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, []);

  useEffect(() => {
    if (!isPolling) return;

    // Run interval
    const id = setInterval(() => {
      // Avoid polling if tab is hidden in background
      if (!document.hidden) {
        executeTick();
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [isPolling, intervalMs, executeTick]);

  return {
    isPolling,
    setIsPolling,
    lastPolledAt,
    refreshNow: executeTick,
  };
}
