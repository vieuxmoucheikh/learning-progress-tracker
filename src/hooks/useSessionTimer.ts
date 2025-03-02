import { useState, useEffect, useCallback, useRef } from 'react';

interface SessionTimerProps {
  isActive: boolean;
  startTime: string | null;
  itemId: string; 
  isPaused?: boolean; 
}

export function useSessionTimer({ isActive, startTime, itemId, isPaused = false }: SessionTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0); 
  const intervalRef = useRef<NodeJS.Timeout | null>(null); 
  const wasRunningRef = useRef<boolean>(false); 
  
  // Internal pause state synchronized with external isPaused prop
  const [internalPaused, setInternalPaused] = useState(isPaused);
  
  // Sync with external pause state
  useEffect(() => {
    if (isPaused !== internalPaused) {
      console.log('Syncing internal pause state:', isPaused);
      setInternalPaused(isPaused);
    }
  }, [isPaused, internalPaused]);
  
  // Load accumulated time from localStorage on mount
  useEffect(() => {
    const storedAccumulatedTime = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
    if (storedAccumulatedTime) {
      accumulatedTimeRef.current = parseInt(storedAccumulatedTime, 10);
    }
    
    // Also check if we have a pause time set, which indicates we're paused
    const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
    if (pauseTimeStr) {
      console.log('Found pause marker in localStorage, setting internal pause state');
      setInternalPaused(true);
    }
  }, [itemId]);

  const validateSession = useCallback(() => {
    if (!startTime) return false;
    
    const start = new Date(startTime).getTime();
    const now = Date.now();
    
    return start <= now && (now - start) < 24 * 60 * 60 * 1000;
  }, [startTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        // Check if we're paused by looking directly at localStorage
        const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
        const isPausedNow = !!pauseTimeStr;
        
        console.log('Page became visible, isPausedNow:', isPausedNow);
        
        if (isPausedNow !== internalPaused) {
          setInternalPaused(isPausedNow);
        }
        
        // Only update time if not paused
        if (!isPausedNow) {
          const storedAccumulatedTime = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
          
          if (storedAccumulatedTime) {
            accumulatedTimeRef.current = parseInt(storedAccumulatedTime, 10);
          }
          
          if (startTime) {
            const start = new Date(startTime).getTime();
            const now = Date.now();
            
            // Calculate elapsed time using accumulated time
            const elapsed = Math.floor((now - start) / 1000) - accumulatedTimeRef.current;
            setElapsedTime(elapsed);
            setLastUpdateTime(now);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, itemId, startTime, internalPaused]);

  // Helper function to format the elapsed time as HH:MM:SS
  const formatElapsedTime = () => {
    // Always check if we're paused first, and if so, use the frozen time
    if (internalPaused && itemId) {
      const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
      if (frozenTimeStr) {
        const frozenTime = parseInt(frozenTimeStr, 10);
        // Format this frozen time instead of using elapsedTime
        const hours = Math.floor(frozenTime / 3600);
        const minutes = Math.floor((frozenTime % 3600) / 60);
        const seconds = frozenTime % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
        localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatElapsedTime());
        
        console.log('Timer frozen at:', elapsedUntilPause, 'seconds');
      }
      
      // Mark that we were running (for resume)
      wasRunningRef.current = true;
    }
  }, [internalPaused, isActive, itemId, startTime, formatElapsedTime]);

  // Effect to handle resuming the timer
  useEffect(() => {
    // Only handle resume when transitioning from paused to active state
    if (isActive && !internalPaused && wasRunningRef.current && startTime) {
      console.log('Timer resumed');
      
      // Get the frozen time if available
      const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
      if (frozenTimeStr) {
        const frozenTime = parseInt(frozenTimeStr, 10);
        console.log('Resuming from frozen time:', frozenTime);
        
        // Set elapsed time to the frozen time
        setElapsedTime(frozenTime);
      }
      
      // Start the interval again
      if (!intervalRef.current) {
        console.log('Starting interval on resume');
        intervalRef.current = setInterval(() => {
          if (!internalPaused) {
            validateSession();
          }
        }, 1000);
      }
      
      // Reset wasRunning flag
      wasRunningRef.current = false;
    }
  }, [internalPaused, isActive, itemId, startTime, validateSession]);

  // Function to validate the session state and update elapsed time
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
      const start = new Date(startTime).getTime();
      const elapsedUntilPause = Math.floor((pauseTime - start) / 1000) - accumulatedTimeRef.current;
      setElapsedTime(elapsedUntilPause);
      
      // Store the frozen time
      localStorage.setItem(`sessionFrozenTime_${itemId}`, elapsedUntilPause.toString());
      localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, elapsedUntilPause.toString());
      localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatElapsedTime());
      
      console.log('Timer frozen at:', elapsedUntilPause, 'seconds');
      return;
    }

    const now = Date.now();
    // Calculate elapsed time by subtracting accumulated pause time
    const elapsed = Math.floor((now - new Date(startTime).getTime()) / 1000) - accumulatedTimeRef.current;
    setElapsedTime(elapsed);
    setLastUpdateTime(now);
    
    localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
    localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, elapsed.toString());
    localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatElapsedTime());
  }, [isActive, internalPaused, startTime, itemId, formatElapsedTime]);

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
      intervalRef.current = setInterval(() => {
        if (!internalPaused) {
          validateSession();
        }
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, internalPaused, startTime, itemId, formatElapsedTime, validateSession]);

  // Effect to update our centralized time state for consistent time tracking
  useEffect(() => {
    // Only update centralized time when active and not paused
    if (isActive && !internalPaused && startTime) {
      // Store current formatted time in localStorage for other components to use
      localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, elapsedTime.toString());
      localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatElapsedTime());
    }
  }, [isActive, internalPaused, elapsedTime, itemId, startTime, formatElapsedTime]);

  // Ensure elapsed time remains frozen when a session is paused
  useEffect(() => {
    if (internalPaused && itemId) {
      // Check for frozen time
      const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
      if (frozenTimeStr) {
        const frozenTime = parseInt(frozenTimeStr, 10);
        setElapsedTime(frozenTime);
      }
    }
  }, [internalPaused, itemId, elapsedTime]);

  // Add a session reset function to properly clean up
  const resetSession = useCallback(() => {
    // Clear the interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Reset state
    setElapsedTime(0);
    setLastUpdateTime(null);
    setInternalPaused(false);
    accumulatedTimeRef.current = 0;
    wasRunningRef.current = false;
    
    // Clean up localStorage
    if (itemId) {
      localStorage.removeItem(`sessionLastUpdate_${itemId}`);
      localStorage.removeItem(`sessionPauseTime_${itemId}`);
      localStorage.removeItem(`sessionAccumulatedTime_${itemId}`);
      localStorage.removeItem(`sessionPauseTimeDisplay_${itemId}`);
      localStorage.removeItem(`sessionFrozenTime_${itemId}`);
      localStorage.removeItem(`sessionCurrentTimeSeconds_${itemId}`);
      localStorage.removeItem(`sessionCurrentTimeFormatted_${itemId}`);
    }
    
    console.log('Timer fully reset');
  }, [itemId]);

  // Effect to handle when session becomes inactive
  useEffect(() => {
    if (!isActive && itemId) {
      resetSession();
    }
  }, [isActive, itemId, resetSession]);

  return {
    elapsedTime,
    formatElapsedTime,
    totalSeconds: elapsedTime,
    isPaused: internalPaused,
    formattedTime: formatElapsedTime()
  };
}
