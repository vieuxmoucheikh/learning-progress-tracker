import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSessionTimerProps {
  isActive: boolean;
  isPaused: boolean;
  startTime: string | null;
  itemId: string;
}

// Helper function to format seconds as HH:MM:SS
const formatSeconds = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const useSessionTimer = ({ isActive, isPaused: externalPaused, startTime, itemId }: UseSessionTimerProps) => {
  // Internal state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [internalPaused, setInternalPaused] = useState(externalPaused);
  
  // Refs to preserve values between renders
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTimeRef = useRef(0);
  
  // Simple helper to clear the interval
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      console.log('Clearing timer interval');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Calculate current elapsed time
  const calculateElapsedTime = useCallback(() => {
    if (!startTime) return 0;
    
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const rawElapsed = Math.floor((now - start) / 1000);
    
    // Subtract the accumulated pause time
    const adjusted = rawElapsed - accumulatedTimeRef.current;
    
    console.log(`Calculating time: raw ${rawElapsed}s - accumulated ${accumulatedTimeRef.current}s = ${adjusted}s`);
    return adjusted;
  }, [startTime]);
  
  // Stop the timer
  const stopTimer = useCallback(() => {
    clearTimerInterval();
    
    // Get and save the current elapsed time if we have a valid start time
    if (startTime) {
      const currentElapsed = calculateElapsedTime();
      setElapsedTime(currentElapsed);
      
      // Save to localStorage for persistence
      localStorage.setItem(`sessionFrozenTime_${itemId}`, currentElapsed.toString());
      localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatSeconds(currentElapsed));
      console.log(`Timer stopped at ${currentElapsed} seconds`);
    }
  }, [calculateElapsedTime, clearTimerInterval, itemId, startTime]);
  
  // Start or resume the timer
  const startTimer = useCallback(() => {
    if (!startTime || internalPaused) return;
    
    console.log("Starting/resuming timer...");
    
    // Clear any existing interval first
    clearTimerInterval();
    
    // Check if we have a frozen time to start from
    const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
    if (frozenTimeStr) {
      const frozenTime = parseInt(frozenTimeStr, 10);
      console.log(`Starting timer from frozen time: ${frozenTime} seconds`);
      
      // Set the elapsed time to the frozen time
      setElapsedTime(frozenTime);
      
      // CRITICAL: For resume to work correctly, we need to adjust the accumulated time
      // to ensure the timer continues from the frozen point
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const rawElapsed = Math.floor((now - start) / 1000);
      
      // Calculate what the accumulated time should be to make elapsed time = frozen time
      const newAccumulatedTime = rawElapsed - frozenTime;
      console.log(`Adjusting accumulated time for resume: raw ${rawElapsed}s - frozen ${frozenTime}s = ${newAccumulatedTime}s`);
      
      // Update our accumulated time
      accumulatedTimeRef.current = newAccumulatedTime;
      localStorage.setItem(`sessionAccumulatedTime_${itemId}`, newAccumulatedTime.toString());
    }
    
    // Start a new interval
    intervalRef.current = setInterval(() => {
      if (internalPaused) {
        // Double-check: if somehow we're paused but the interval is running, stop it
        clearTimerInterval();
        return;
      }
      
      const currentElapsed = calculateElapsedTime();
      setElapsedTime(currentElapsed);
      setLastUpdateTime(Date.now());
      
      // Save current time to localStorage
      localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, currentElapsed.toString());
      localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatSeconds(currentElapsed));
    }, 1000);
    
    console.log('Timer interval started');
  }, [calculateElapsedTime, clearTimerInterval, internalPaused, itemId, startTime]);
  
  // Effect to initialize from localStorage
  useEffect(() => {
    if (isActive && startTime) {
      // Initialize accumulated time from localStorage
      const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
      if (accumulatedTimeStr) {
        const accumulatedTime = parseInt(accumulatedTimeStr, 10);
        accumulatedTimeRef.current = accumulatedTime;
        console.log('Initialized accumulated time:', accumulatedTime, 'seconds');
      }
      
      // Initialize elapsed time from localStorage
      const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
      if (frozenTimeStr) {
        const frozenTime = parseInt(frozenTimeStr, 10);
        setElapsedTime(frozenTime);
        console.log('Initialized elapsed time from frozen time:', frozenTime, 'seconds');
      }
    }
  }, [isActive, itemId, startTime]);
  
  // Effect to sync internal paused state with external
  useEffect(() => {
    console.log('External pause state changed:', externalPaused);
    setInternalPaused(externalPaused);
  }, [externalPaused]);
  
  // Effect to handle pausing
  useEffect(() => {
    if (internalPaused) {
      console.log('Timer paused internally');
      stopTimer();
    } else if (isActive && startTime) {
      console.log('Timer resumed internally');
      startTimer();
    }
  }, [internalPaused, isActive, startTime, stopTimer, startTimer]);
  
  // Main effect to manage timer based on active state
  useEffect(() => {
    if (!isActive || !startTime) {
      clearTimerInterval();
      return;
    }
    
    // Check if we need to be paused
    const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
    if (pauseTimeStr) {
      if (!internalPaused) {
        console.log('Found pause marker in localStorage, forcing pause');
        setInternalPaused(true);
      }
      return;
    }
    
    // Start timer if not paused
    if (!internalPaused) {
      startTimer();
    }
    
    // Cleanup on unmount
    return () => {
      clearTimerInterval();
    };
  }, [isActive, internalPaused, itemId, startTime, clearTimerInterval, startTimer]);
  
  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page visible again');
        
        // Check if we should be paused
        const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
        
        if (pauseTimeStr) {
          // If we have a pause marker, make sure we're paused
          if (!internalPaused) {
            console.log('Found pause marker on visibility change, pausing');
            setInternalPaused(true);
          }
        } else if (isActive && startTime && !internalPaused) {
          // If we're active and not paused, restart the timer
          console.log('Restarting timer on visibility change');
          startTimer();
        }
      } else {
        // When page becomes hidden, save current state but don't stop the timer
        // This helps maintain accuracy when the user returns to the page
        console.log('Page hidden');
        
        if (isActive && startTime && !internalPaused) {
          const currentElapsed = calculateElapsedTime();
          localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, currentElapsed.toString());
          localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatSeconds(currentElapsed));
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [calculateElapsedTime, internalPaused, isActive, itemId, startTime, startTimer]);
  
  return {
    elapsedTime,
    formattedTime: formatSeconds(elapsedTime),
    lastUpdateTime,
    isPaused: internalPaused,
    setIsPaused: setInternalPaused
  };
};
