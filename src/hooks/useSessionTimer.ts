import { useState, useEffect, useCallback, useRef } from 'react';

interface SessionTimerProps {
  isActive: boolean;
  startTime: string | null;
  itemId: string; 
  isPaused?: boolean; // New parameter to control pause state
}

export function useSessionTimer({ isActive, startTime, itemId, isPaused = false }: SessionTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  
  // Use refs to maintain state across renders and visibility changes
  const accumulatedTimeRef = useRef(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);

  const validateSession = useCallback(() => {
    if (!startTime) return false;
    
    const start = new Date(startTime).getTime();
    const now = Date.now();
    
    return start <= now && (now - start) < 24 * 60 * 60 * 1000;
  }, [startTime]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      isVisibleRef.current = isVisible;
      
      if (isActive && !isPaused) {
        if (isVisible) {
          // Page is visible again, sync the timer state
          const storedLastUpdate = localStorage.getItem(`sessionLastUpdate_${itemId}`);
          const pauseTime = localStorage.getItem(`sessionPauseTime_${itemId}`);
          
          if (storedLastUpdate) {
            const lastUpdate = parseInt(storedLastUpdate, 10);
            const now = Date.now();
            
            // If we were paused, don't accumulate time
            if (!pauseTime) {
              // Calculate time passed while page was hidden
              const timeDiff = Math.floor((now - lastUpdate) / 1000);
              
              // Update accumulated time
              accumulatedTimeRef.current += timeDiff;
              
              // Update localStorage with new accumulated time
              localStorage.setItem(`sessionAccumulatedTime_${itemId}`, accumulatedTimeRef.current.toString());
            }
          }
          
          // Restart the timer
          startTimeTracking();
        } else {
          // Page is hidden, pause the interval but keep tracking time
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          
          // Store the current time as the last update
          const now = Date.now();
          localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
        }
      }
    };

    // Add event listener for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, itemId, isPaused]);

  // Start time tracking function
  const startTimeTracking = useCallback(() => {
    // Clear any existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    if (!startTime || !isActive || isPaused) return;
    
    // Get accumulated time from localStorage if it exists
    const storedAccumulatedTime = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
    if (storedAccumulatedTime) {
      accumulatedTimeRef.current = parseInt(storedAccumulatedTime, 10);
    }
    
    const start = new Date(startTime).getTime();
    startTimeRef.current = start;
    
    const updateElapsedTime = () => {
      const now = Date.now();
      const baseElapsed = Math.floor((now - start) / 1000);
      const totalElapsed = baseElapsed + accumulatedTimeRef.current;
      
      setElapsedTime(totalElapsed);
      setLastUpdateTime(now);
      
      localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
    };

    updateElapsedTime(); 
    timerIntervalRef.current = setInterval(updateElapsedTime, 1000);
  }, [isActive, startTime, itemId, isPaused]);

  // Handle pausing the timer
  useEffect(() => {
    if (isPaused) {
      // If we're pausing, store the current time
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // Store pause time in localStorage
      const now = Date.now();
      localStorage.setItem(`sessionPauseTime_${itemId}`, now.toString());
      
      // Calculate and store accumulated time
      if (startTimeRef.current) {
        const additionalTime = Math.floor((now - startTimeRef.current) / 1000);
        accumulatedTimeRef.current += additionalTime;
        localStorage.setItem(`sessionAccumulatedTime_${itemId}`, accumulatedTimeRef.current.toString());
      }
    } else if (isActive) {
      // If we're resuming, clear pause time
      localStorage.removeItem(`sessionPauseTime_${itemId}`);
      
      // Start tracking again
      startTimeTracking();
    }
  }, [isPaused, isActive, itemId, startTimeTracking]);

  // Main timer effect
  useEffect(() => {
    if (isActive && !isPaused && validateSession()) {
      // Initialize accumulated time from localStorage
      const storedAccumulatedTime = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
      if (storedAccumulatedTime) {
        accumulatedTimeRef.current = parseInt(storedAccumulatedTime, 10);
      } else {
        accumulatedTimeRef.current = 0;
        localStorage.setItem(`sessionAccumulatedTime_${itemId}`, '0');
      }
      
      startTimeTracking();
    } else {
      // Clean up when not active
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      if (!isActive) {
        setElapsedTime(0);
        setLastUpdateTime(null);
        localStorage.removeItem(`sessionLastUpdate_${itemId}`);
        localStorage.removeItem(`sessionAccumulatedTime_${itemId}`);
        localStorage.removeItem(`sessionPauseTime_${itemId}`);
        accumulatedTimeRef.current = 0;
        startTimeRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isActive, startTime, itemId, validateSession, isPaused, startTimeTracking]);

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
    isValidSession: validateSession(),
    accumulatedTime: accumulatedTimeRef.current
  };
}
