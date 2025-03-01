import { useState, useEffect, useCallback, useRef } from 'react';

interface SessionTimerProps {
  isActive: boolean;
  startTime: string | null;
  itemId: string;
}

export function useSessionTimer({ isActive, startTime, itemId }: SessionTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Session state tracking
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const totalPausedTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  
  const validateSession = useCallback(() => {
    if (!startTime) return false;
    
    const start = new Date(startTime).getTime();
    const now = Date.now();
    
    return start <= now && (now - start) < 24 * 60 * 60 * 1000;
  }, [startTime]);

  // Initialize or update the session state when props change
  useEffect(() => {
    // Clear previous state
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!startTime || !validateSession()) {
      // Reset everything if no valid session
      startTimeRef.current = null;
      pausedAtRef.current = null;
      totalPausedTimeRef.current = 0;
      isRunningRef.current = false;
      setElapsedTime(0);
      setLastUpdateTime(null);
      return;
    }

    // Set the start time if not already set
    if (!startTimeRef.current) {
      startTimeRef.current = new Date(startTime).getTime();
    }

    // Check for stored paused state
    const storedPauseTime = localStorage.getItem(`sessionPauseTime_${itemId}`);
    const storedTotalPausedTime = localStorage.getItem(`sessionTotalPausedTime_${itemId}`);

    if (storedPauseTime) {
      pausedAtRef.current = parseInt(storedPauseTime, 10);
    }

    if (storedTotalPausedTime) {
      totalPausedTimeRef.current = parseInt(storedTotalPausedTime, 10);
    }

    // Update running state based on isActive prop
    isRunningRef.current = isActive;

    // If active, start the timer
    if (isActive) {
      // If we were paused, calculate additional pause time
      if (pausedAtRef.current) {
        const now = Date.now();
        const additionalPauseTime = now - pausedAtRef.current;
        totalPausedTimeRef.current += additionalPauseTime;
        
        // Store the updated total paused time
        localStorage.setItem(`sessionTotalPausedTime_${itemId}`, totalPausedTimeRef.current.toString());
        
        // Clear the pause timestamp
        pausedAtRef.current = null;
        localStorage.removeItem(`sessionPauseTime_${itemId}`);
      }

      // Start the interval
      const updateTimer = () => {
        if (!startTimeRef.current) return;

        const now = Date.now();
        // Calculate elapsed time compensating for paused time
        const rawElapsed = now - startTimeRef.current;
        const adjustedElapsed = Math.floor((rawElapsed - totalPausedTimeRef.current) / 1000);
        
        setElapsedTime(adjustedElapsed > 0 ? adjustedElapsed : 0);
        setLastUpdateTime(now);
        
        // Update localStorage
        localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
      };

      updateTimer(); // Initial update
      intervalRef.current = setInterval(updateTimer, 1000);
    } else {
      // If not active and not already paused, record pause time
      if (!pausedAtRef.current) {
        pausedAtRef.current = Date.now();
        localStorage.setItem(`sessionPauseTime_${itemId}`, pausedAtRef.current.toString());
      }
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, startTime, itemId, validateSession]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!startTimeRef.current || !isRunningRef.current) return;

      if (document.visibilityState === 'hidden') {
        // Tab hidden - record the time but DON'T pause the timer
        localStorage.setItem(`tabHiddenTime_${itemId}`, Date.now().toString());
      } else if (document.visibilityState === 'visible') {
        // Tab visible again - update last update time but don't change the timing logic
        const hiddenTimeStr = localStorage.getItem(`tabHiddenTime_${itemId}`);
        if (hiddenTimeStr) {
          const now = Date.now();
          setLastUpdateTime(now);
          localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
          localStorage.removeItem(`tabHiddenTime_${itemId}`);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [itemId]);

  // Format the elapsed time for display
  const formatElapsedTime = useCallback(() => {
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedTime]);

  return { 
    elapsedTime, 
    formatElapsedTime, 
    lastUpdateTime,
    isValidSession: validateSession()
  };
}
