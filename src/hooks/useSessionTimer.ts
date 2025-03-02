import { useState, useEffect, useRef } from 'react';

interface Props {
  isActive: boolean;
  startTime: string | null;
  itemId: string;
  isPaused: boolean;
}

export function useSessionTimer({ isActive, startTime, itemId, isPaused }: Props) {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const isValidSession = isActive && startTime;

  // Function to calculate elapsed time
  const calculateElapsedTime = () => {
    if (!isValidSession) return 0;
    
    // If paused, return the accumulated time without adding current time
    if (isPaused) {
      const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
      if (pauseTimeStr) {
        const pauseTime = parseInt(pauseTimeStr, 10);
        const startTimeMs = new Date(startTime).getTime();
        return accumulatedTimeRef.current + (pauseTime - startTimeMs);
      }
      return accumulatedTimeRef.current;
    }
    
    // If active and not paused, calculate current elapsed time
    const startTimeMs = new Date(startTime).getTime();
    const now = Date.now();
    
    // Get accumulated time from localStorage or use the ref value
    const storedAccumulatedTime = localStorage.getItem(`accumulatedTime_${itemId}`);
    const accumulatedTime = storedAccumulatedTime 
      ? parseInt(storedAccumulatedTime, 10) 
      : accumulatedTimeRef.current;
    
    return accumulatedTime + (now - startTimeMs);
  };

  // Update timer
  useEffect(() => {
    if (!isValidSession) {
      setElapsedTime(0);
      return;
    }

    // Load accumulated time from localStorage
    const storedAccumulatedTime = localStorage.getItem(`accumulatedTime_${itemId}`);
    if (storedAccumulatedTime) {
      accumulatedTimeRef.current = parseInt(storedAccumulatedTime, 10);
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Only start interval if session is active and not paused
    if (isActive && !isPaused) {
      // Initial calculation
      setElapsedTime(calculateElapsedTime());
      setLastUpdateTime(Date.now());
      
      // Start interval
      timerRef.current = window.setInterval(() => {
        setElapsedTime(calculateElapsedTime());
        setLastUpdateTime(Date.now());
      }, 1000);
    } else if (isPaused) {
      // If paused, just set the elapsed time once
      setElapsedTime(calculateElapsedTime());
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, startTime, isPaused, itemId]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isValidSession && !isPaused) {
          // Recalculate elapsed time when page becomes visible
          setElapsedTime(calculateElapsedTime());
          setLastUpdateTime(Date.now());
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isValidSession, isPaused]);

  // Format elapsed time
  const formatElapsedTime = () => {
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    elapsedTime,
    formatElapsedTime,
    lastUpdateTime,
    isValidSession
  };
}
