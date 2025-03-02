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
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [internalPaused, setInternalPaused] = useState(externalPaused);
  
  // Refs to preserve values between renders
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasRunningRef = useRef(false);
  const accumulatedTimeRef = useRef(0);
  
  // Format the elapsed time as HH:MM:SS
  const formatElapsedTime = useCallback(() => {
    return formatSeconds(elapsedTime);
  }, [elapsedTime]);
  
  // Function to update elapsed time
  const updateElapsedTime = useCallback(() => {
    if (!startTime || internalPaused) return;
    
    const now = Date.now();
    const start = new Date(startTime).getTime();
    const elapsed = Math.floor((now - start) / 1000) - accumulatedTimeRef.current;
    
    setElapsedTime(elapsed);
    setLastUpdateTime(now);
    
    localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
    localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, elapsed.toString());
    localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatSeconds(elapsed));
  }, [startTime, internalPaused, itemId]);
  
  // Function to validate the session state and handle pauses
  const validateSession = useCallback(() => {
    // Get the current pause time
    const currentPauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
    
    // If we have a pause time and we're active and not already paused internally, switch to paused state
    if (currentPauseTimeStr && isActive && !internalPaused) {
      console.log('External pause detected, pausing timer');
      // Force the paused state to match external pause state
      setInternalPaused(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Calculate elapsed time up to the pause point
      const pauseTime = parseInt(currentPauseTimeStr, 10);
      const start = new Date(startTime || '').getTime();
      const elapsedUntilPause = Math.floor((pauseTime - start) / 1000) - accumulatedTimeRef.current;
      setElapsedTime(elapsedUntilPause);
      
      // Store the frozen time
      localStorage.setItem(`sessionFrozenTime_${itemId}`, elapsedUntilPause.toString());
      localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, elapsedUntilPause.toString());
      localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatSeconds(elapsedUntilPause));
      
      console.log('Timer frozen at:', elapsedUntilPause, 'seconds');
      return;
    }

    // Otherwise just update the elapsed time normally
    updateElapsedTime();
  }, [isActive, internalPaused, startTime, itemId, updateElapsedTime]);
  
  // Effect to sync internal paused state with external
  useEffect(() => {
    setInternalPaused(externalPaused);
  }, [externalPaused]);
  
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
      const currentTimeStr = localStorage.getItem(`sessionCurrentTimeSeconds_${itemId}`);
      if (currentTimeStr) {
        const currentTime = parseInt(currentTimeStr, 10);
        setElapsedTime(currentTime);
        console.log('Initialized elapsed time:', currentTime, 'seconds');
      }
      
      // Check if we have a pause time
      const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
      if (pauseTimeStr) {
        setInternalPaused(true);
        console.log('Session is paused');
      } else {
        console.log('Session is active');
      }
    }
  }, [isActive, startTime, itemId]);
  
  // Effect to handle pausing the timer
  useEffect(() => {
    // Only handle pause when transitioning to paused state and we're active
    if (isActive && internalPaused && startTime) {
      console.log('Timer paused');
      
      // Immediately stop the interval when paused
      if (intervalRef.current) {
        console.log('Clearing interval on pause');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Get current pause time from localStorage
      const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
      if (pauseTimeStr) {
        const pauseTime = parseInt(pauseTimeStr, 10);
        const start = new Date(startTime).getTime();
        
        // Calculate elapsed time up to the pause point
        const elapsedUntilPause = Math.floor((pauseTime - start) / 1000) - accumulatedTimeRef.current;
        
        // Freeze the timer at this value
        setElapsedTime(elapsedUntilPause);
        
        // Store the frozen time value in localStorage for consistency
        localStorage.setItem(`sessionFrozenTime_${itemId}`, elapsedUntilPause.toString());
        localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, elapsedUntilPause.toString());
        localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatSeconds(elapsedUntilPause));
        
        console.log('Timer frozen at:', elapsedUntilPause, 'seconds');
      }
      
      // Mark that we were running (for resume)
      wasRunningRef.current = true;
    }
  }, [internalPaused, isActive, itemId, startTime]);
  
  // Effect to handle resuming the timer
  useEffect(() => {
    // Only handle resume when transitioning from paused to active state
    if (isActive && !internalPaused && startTime) {
      console.log('Timer may need to resume, wasRunningRef:', wasRunningRef.current);
      
      // Get the frozen time if available, regardless of wasRunningRef
      const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
      if (frozenTimeStr) {
        const frozenTime = parseInt(frozenTimeStr, 10);
        console.log('Found frozen time:', frozenTime, 'seconds');
        
        // Set elapsed time to the frozen time to resume from the right point
        setElapsedTime(frozenTime);
      }
      
      // Start the interval if it's not already running
      if (!intervalRef.current) {
        console.log('Starting interval on resume or initial start');
        intervalRef.current = setInterval(() => {
          validateSession();
        }, 1000);
      }
      
      // Reset wasRunning flag
      wasRunningRef.current = false;
    }
  }, [internalPaused, isActive, itemId, startTime, validateSession]);
  
  // Effect to manage the interval for updating elapsed time
  useEffect(() => {
    // If we're not active or we're paused, don't run the timer
    if (!isActive || internalPaused || !startTime) {
      // Clear any existing interval
      if (intervalRef.current) {
        console.log('Clearing interval - not active or paused');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    // Update immediately then set interval
    validateSession();
    
    // Only create a new interval if we don't already have one
    if (!intervalRef.current) {
      console.log('Creating new interval for timer');
      intervalRef.current = setInterval(() => {
        validateSession();
      }, 1000);
    }
    
    // Cleanup when component unmounts or dependencies change
    return () => {
      if (intervalRef.current) {
        console.log('Cleaning up interval on dependency change');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, internalPaused, startTime, validateSession]);
  
  // Effect to update our centralized time state for consistent time tracking
  useEffect(() => {
    if (isActive && !internalPaused) {
      localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, elapsedTime.toString());
      localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatSeconds(elapsedTime));
    }
  }, [isActive, internalPaused, itemId, elapsedTime]);
  
  // Effect to handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible');
        
        // If we're active and not paused, update the elapsed time
        if (isActive && !internalPaused && startTime) {
          console.log('Updating elapsed time after visibility change');
          validateSession();
          
          // Restart the interval if needed
          if (!intervalRef.current) {
            console.log('Restarting interval after visibility change');
            intervalRef.current = setInterval(() => {
              if (!internalPaused) {
                validateSession();
              }
            }, 1000);
          }
        }
      } else {
        console.log('Page became hidden');
        
        // Clear the interval when the page is hidden
        if (intervalRef.current) {
          console.log('Clearing interval on page hide');
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, internalPaused, startTime, validateSession]);
  
  return {
    elapsedTime,
    formattedTime: formatSeconds(elapsedTime),
    lastUpdateTime,
    isPaused: internalPaused,
    setIsPaused: setInternalPaused
  };
};
