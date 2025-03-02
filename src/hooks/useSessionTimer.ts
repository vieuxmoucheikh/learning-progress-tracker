import { useState, useEffect, useRef } from 'react';

interface UseSessionTimerProps {
  isActive: boolean;
  startTime: string | null;
  itemId: string;
  isPaused: boolean;
}

export function useSessionTimer({ isActive, startTime, itemId, isPaused }: UseSessionTimerProps) {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [isValidSession, setIsValidSession] = useState<boolean>(true);
  
  // Use refs to maintain values across renders and for visibility change handling
  const isActiveRef = useRef(isActive);
  const isPausedRef = useRef(isPaused);
  const itemIdRef = useRef(itemId);
  const startTimeRef = useRef(startTime);
  const elapsedTimeRef = useRef(elapsedTime);
  
  // Update refs when props change
  useEffect(() => {
    isActiveRef.current = isActive;
    isPausedRef.current = isPaused;
    itemIdRef.current = itemId;
    startTimeRef.current = startTime;
  }, [isActive, isPaused, itemId, startTime]);

  // Initialize timer
  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsedTime(0);
      setLastUpdateTime(null);
      return;
    }

    // Get accumulated time from localStorage if session was paused
    let accumulatedTime = 0;
    const storedAccumulatedTime = localStorage.getItem(`accumulatedTime_${itemId}`);
    if (storedAccumulatedTime) {
      accumulatedTime = parseInt(storedAccumulatedTime, 10) || 0;
    }

    // Calculate initial elapsed time
    const startTimeMs = new Date(startTime).getTime();
    const now = Date.now();
    
    // If not paused, calculate elapsed time including accumulated time
    if (!isPaused) {
      const currentElapsedTime = now - startTimeMs;
      setElapsedTime(accumulatedTime + currentElapsedTime);
      setLastUpdateTime(now);
    } else {
      // If paused, just use the accumulated time
      setElapsedTime(accumulatedTime);
    }

    setIsValidSession(true);
  }, [isActive, startTime, itemId, isPaused]);

  // Update timer at regular intervals
  useEffect(() => {
    if (!isActive || !startTime || isPaused) {
      return;
    }

    const intervalId = setInterval(() => {
      if (isPausedRef.current) {
        // Don't update if paused
        return;
      }
      
      setElapsedTime(prevElapsedTime => {
        const newElapsedTime = prevElapsedTime + 1000; // Add 1 second
        elapsedTimeRef.current = newElapsedTime; // Update ref for visibility handler
        return newElapsedTime;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive, startTime, isPaused]);

  // Handle page visibility changes
  useEffect(() => {
    if (!isActive || !startTime) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page is now visible again
        if (!isActiveRef.current || !startTimeRef.current) {
          return;
        }

        // If the session is paused, don't update the timer
        if (isPausedRef.current) {
          return;
        }

        // Get accumulated time from localStorage
        let accumulatedTime = 0;
        const storedAccumulatedTime = localStorage.getItem(`accumulatedTime_${itemIdRef.current}`);
        if (storedAccumulatedTime) {
          accumulatedTime = parseInt(storedAccumulatedTime, 10) || 0;
        }

        // Calculate new elapsed time
        const startTimeMs = new Date(startTimeRef.current).getTime();
        const now = Date.now();
        const currentElapsedTime = now - startTimeMs;
        
        // Update elapsed time
        setElapsedTime(accumulatedTime + currentElapsedTime);
        setLastUpdateTime(now);
      }
    };

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, startTime]);

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = (): string => {
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formatNumber = (num: number): string => (num < 10 ? `0${num}` : `${num}`);

    return `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;
  };

  return { elapsedTime, formatElapsedTime, lastUpdateTime, isValidSession };
}
