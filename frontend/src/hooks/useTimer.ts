import { useState, useEffect, useCallback, useRef } from 'react';

export const useTimer = (durationSeconds: number, onExpire: () => void) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  // Only re-sync from the parent-provided duration once, when it first becomes
  // available (e.g. after the exam attempt loads). Re-running this on every
  // parent re-render would reset the countdown each second instead of ticking.
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (durationSeconds <= 0 || hasInitialized.current) return;
    hasInitialized.current = true;
    setTimeLeft(durationSeconds);
    setIsRunning(true);
  }, [durationSeconds]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onExpire();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onExpire]);

  const isWarning = timeLeft > 0 && timeLeft <= 300;
  const isExpired = timeLeft === 0;

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  const deductSeconds = useCallback((seconds: number) => {
    setTimeLeft((prev) => {
      const next = Math.max(0, prev - seconds);
      if (next <= 0) {
        setIsRunning(false);
        onExpire();
        return 0;
      }
      return next;
    });
  }, [onExpire]);

  return {
    timeLeft,
    isRunning,
    isWarning,
    isExpired,
    formattedTime: formatTime(timeLeft),
    deductSeconds,
  };
};
