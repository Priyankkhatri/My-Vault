import { useEffect, useRef, useCallback } from 'react';

/**
 * useIdleTimer — Locks the vault after a period of user inactivity.
 * 
 * Listens for mousemove and keydown events globally.
 * Resets the countdown on any activity.
 * Calls `onIdle` when the timer expires.
 * 
 * @param onIdle - Callback fired when inactivity timeout is reached
 * @param timeoutMinutes - Timeout in minutes. Pass 0 or 'never' equivalent to disable.
 * @param enabled - Whether the timer is active (should be false when vault is locked)
 */
export function useIdleTimer(
  onIdle: () => void,
  timeoutMinutes: number,
  enabled: boolean = true
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);

  // Keep the callback ref current without re-registering listeners
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (timeoutMinutes > 0 && enabled) {
      timerRef.current = setTimeout(() => {
        onIdleRef.current();
      }, timeoutMinutes * 60 * 1000);
    }
  }, [timeoutMinutes, enabled]);

  useEffect(() => {
    if (!enabled || timeoutMinutes <= 0) {
      // Clear any existing timer when disabled
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start initial timer
    resetTimer();

    // Activity events that reset the timer
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

    const handleActivity = () => resetTimer();

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, enabled, timeoutMinutes]);
}
