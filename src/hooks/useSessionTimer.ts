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
        
        console.log('Timer frozen at:', elapsedUntilPause, 'seconds');
      }
      
      // Mark that we were running (for resume)
      wasRunningRef.current = true;
    }
  }, [internalPaused, isActive, itemId, startTime]);

  // Effect to handle resuming the timer
  useEffect(() => {
    // Only handle resume when transitioning from paused to active state
    if (isActive && !internalPaused && wasRunningRef.current && startTime) {
      console.log('Timer resuming');
      
      // Get current pause time from localStorage
      const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
      if (pauseTimeStr) {
        const pauseTime = parseInt(pauseTimeStr, 10);
        const now = Date.now();
        
        // Calculate how long we were paused
        const pauseDuration = Math.floor((now - pauseTime) / 1000);
        
        // Get current accumulated time
        const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
        const accumulatedTime = accumulatedTimeStr ? parseInt(accumulatedTimeStr, 10) : 0;
        
        // Add pause duration to accumulated time
        const newAccumulatedTime = accumulatedTime + pauseDuration;
        
        // Update accumulated time
        accumulatedTimeRef.current = newAccumulatedTime;
        localStorage.setItem(`sessionAccumulatedTime_${itemId}`, newAccumulatedTime.toString());
        
        // CRITICAL: Remove pause marker and frozen time
        localStorage.removeItem(`sessionPauseTime_${itemId}`);
        localStorage.removeItem(`sessionFrozenTime_${itemId}`);
        
        console.log('Added pause duration to accumulated time:', pauseDuration, 'seconds');
        console.log('New accumulated time:', newAccumulatedTime, 'seconds');
      }
      
      // Reset flag
      wasRunningRef.current = false;
    }
  }, [internalPaused, isActive, itemId, startTime]);

  // Main timer effect
  useEffect(() => {
    // Clean up any existing interval first
    if (intervalRef.current) {
      console.log('Cleaning up interval:', intervalRef.current);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Force check of pause state from localStorage
    const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
    const isPausedNow = !!pauseTimeStr;
    
    // If localStorage says we're paused but our internal state disagrees, sync them
    if (isPausedNow !== internalPaused) {
      console.log('Correcting internal paused state from localStorage');
      setInternalPaused(isPausedNow);
      return; // Exit early and let the re-render handle the rest
    }

    // If we're paused, use the frozen time value if available
    if (isPausedNow || internalPaused) {
      console.log('Timer is paused, not starting interval');
      
      // If we have a frozen time value, use it
      const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
      if (frozenTimeStr) {
        const frozenTime = parseInt(frozenTimeStr, 10);
        setElapsedTime(frozenTime);
        console.log('Using frozen time value:', frozenTime, 'seconds');
      }
      
      return;
    }

    // Only run the timer when we're active, not paused, and have a valid start time
    if (isActive && !internalPaused && !isPausedNow && startTime && validateSession()) {
      console.log('Starting timer interval');
      
      const start = new Date(startTime).getTime();
      
      const updateElapsedTime = () => {
        // CRITICAL: Double-check that we're not paused on EVERY tick
        // This ensures we stop immediately when another component sets pause
        const currentPauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
        if (currentPauseTimeStr) {
          // We detected a pause, stop the interval and update internal state
          console.log('Pause detected during interval, stopping timer');
          setInternalPaused(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          
          // Calculate elapsed time up to the pause point
          const pauseTime = parseInt(currentPauseTimeStr, 10);
          const elapsedUntilPause = Math.floor((pauseTime - start) / 1000) - accumulatedTimeRef.current;
          setElapsedTime(elapsedUntilPause);
          
          // Store the frozen time
          localStorage.setItem(`sessionFrozenTime_${itemId}`, elapsedUntilPause.toString());
          
          console.log('Timer frozen at:', elapsedUntilPause, 'seconds');
          return;
        }

        const now = Date.now();
        // Calculate elapsed time by subtracting accumulated pause time
        const elapsed = Math.floor((now - start) / 1000) - accumulatedTimeRef.current;
        setElapsedTime(elapsed);
        setLastUpdateTime(now);
        
        localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
      };
      
      // Update immediately then set interval
      updateElapsedTime();
      intervalRef.current = setInterval(updateElapsedTime, 1000);
      console.log('Timer started with interval ID:', intervalRef.current);
    } 
    // If we're inactive, reset everything
    else if (!isActive) {
      setElapsedTime(0);
      setLastUpdateTime(null);
      accumulatedTimeRef.current = 0;
      wasRunningRef.current = false;
      
      // Clean up localStorage
      localStorage.removeItem(`sessionLastUpdate_${itemId}`);
      localStorage.removeItem(`sessionPauseTime_${itemId}`);
      localStorage.removeItem(`sessionAccumulatedTime_${itemId}`);
      localStorage.removeItem(`sessionPauseTimeDisplay_${itemId}`);
      localStorage.removeItem(`sessionFrozenTime_${itemId}`);
      
      console.log('Timer reset');
    }

    // Cleanup function to clear interval when dependencies change
    return () => {
      if (intervalRef.current) {
        console.log('Cleaning up interval:', intervalRef.current);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, internalPaused, startTime, itemId, validateSession]);

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
