import { useEffect, useRef, useCallback } from 'react';

/**
 * Tracks keyboard, click, and hesitation events.
 * Sends structured events via the provided sendEvent function.
 */
export function useInteractionTracker(sendEvent) {
  const lastKeyTime = useRef(null);
  const lastClickTime = useRef(null);
  const hesitationTimer = useRef(null);
  const HESITATION_THRESHOLD = 2000; // ms

  const resetHesitationTimer = useCallback(() => {
    clearTimeout(hesitationTimer.current);
    hesitationTimer.current = setTimeout(() => {
      sendEvent({ type: 'hesitation', duration: HESITATION_THRESHOLD });
    }, HESITATION_THRESHOLD);
  }, [sendEvent]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const now = Date.now();
      const gap = lastKeyTime.current ? now - lastKeyTime.current : 0;
      lastKeyTime.current = now;

      sendEvent({
        type: 'keypress',
        key: e.key,
        gap,
        ts: now,
      });

      resetHesitationTimer();
    };

    const handleClick = (e) => {
      const now = Date.now();
      const gap = lastClickTime.current ? now - lastClickTime.current : 0;
      lastClickTime.current = now;

      sendEvent({
        type: 'click',
        target: e.target?.tagName || 'unknown',
        gap,
        ts: now,
      });

      resetHesitationTimer();
    };

    const handleMouseMove = () => {
      resetHesitationTimer();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);
    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Start hesitation timer immediately
    resetHesitationTimer();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hesitationTimer.current);
    };
  }, [sendEvent, resetHesitationTimer]);
}
