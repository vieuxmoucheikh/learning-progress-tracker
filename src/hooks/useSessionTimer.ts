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
  const pausedTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);

  const validateSession = useCallback(() => {
    if (!startTime) return false;
    
    const start = new Date(startTime).getTime();
    const now = Date.now();
    
    return start <= now && (now - start) < 24 * 60 * 60 * 1000;
  }, [startTime]);

  // Get the paused time, if any
  useEffect(() => {
    if (isActive && startTime) {
      const pausedTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
      if (pausedTimeStr) {
        pausedTimeRef.current = parseInt(pausedTimeStr, 10);
        const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
        if (accumulatedTimeStr) {
          accumulatedTimeRef.current = parseInt(accumulatedTimeStr, 10);
        }
      }
    }
  }, [isActive, startTime, itemId]);

  // Timer effect
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isActive && startTime && validateSession()) {
      const start = new Date(startTime).getTime();
      
      const updateElapsedTime = () => {
        const now = Date.now();
        let elapsed;
        
        // If we have a paused time, calculate using accumulated time
        if (pausedTimeRef.current) {
          // Calculate the new accumulated time since resuming
          const timeSinceResume = now - pausedTimeRef.current;
          // Total elapsed = previously accumulated time + time since resume
          elapsed = Math.floor((accumulatedTimeRef.current + timeSinceResume) / 1000);
        } else {
          // Normal calculation from start time
          elapsed = Math.floor((now - start) / 1000);
        }
        
        setElapsedTime(elapsed);
        setLastUpdateTime(now);
        
        localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
      };

      updateElapsedTime(); 
      intervalRef.current = setInterval(updateElapsedTime, 1000);
    } else {
      // If timer is not active but we have a valid session, store the accumulated time
      if (!isActive && startTime && validateSession()) {
        const pausedTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
        if (!pausedTimeStr) {
          const now = Date.now();
          const start = new Date(startTime).getTime();
          const currentElapsed = now - start;
          
          // Store the time when paused and the total accumulated time
          localStorage.setItem(`sessionPauseTime_${itemId}`, now.toString());
          localStorage.setItem(`sessionAccumulatedTime_${itemId}`, currentElapsed.toString());
          pausedTimeRef.current = now;
          accumulatedTimeRef.current = currentElapsed;
        }
      } else {
        // If timer is completely stopped (not just paused)
        setElapsedTime(0);
        setLastUpdateTime(null);
        localStorage.removeItem(`sessionLastUpdate_${itemId}`);
        localStorage.removeItem(`sessionPauseTime_${itemId}`);
        localStorage.removeItem(`sessionAccumulatedTime_${itemId}`);
        pausedTimeRef.current = null;
        accumulatedTimeRef.current = 0;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, startTime, itemId, validateSession]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // When tab becomes hidden, record the current time
        if (isActive && intervalRef.current) {
          // No need to stop the timer, just record the time
          localStorage.setItem(`tabHiddenTime_${itemId}`, Date.now().toString());
        }
      } else if (document.visibilityState === 'visible') {
        // When tab becomes visible again
        if (isActive) {
          const hiddenTimeStr = localStorage.getItem(`tabHiddenTime_${itemId}`);
          if (hiddenTimeStr) {
            const hiddenTime = parseInt(hiddenTimeStr, 10);
            const now = Date.now();
            
            // Update lastUpdateTime to ensure timer continuity
            setLastUpdateTime(now);
            localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
            localStorage.removeItem(`tabHiddenTime_${itemId}`);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, itemId]);

  const formatElapsedTime = () => {
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return { 
    elapsedTime, 
    formatElapsedTime, 
    lastUpdateTime,
    isValidSession: validateSession()
  };
}
