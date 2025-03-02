import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSessionTimerProps {
  isActive: boolean;
  startTime: string | null;
  externalPaused?: boolean;
  itemId: string;
}

// Helper function to format seconds as HH:MM:SS
const formatSeconds = (seconds: number): string => {
  // Ensure seconds is a positive number
  seconds = Math.max(0, seconds);
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const useSessionTimer = ({ isActive, startTime, externalPaused = false, itemId }: UseSessionTimerProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [formattedTime, setFormattedTime] = useState('00:00:00');
  const [internalPaused, setInternalPaused] = useState(externalPaused);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  
  // References to preserve values across renders
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const wasResumedRef = useRef<boolean>(false);
  
  // Clear any existing interval
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('Timer interval cleared');
    }
  }, []);
  
  // Helper to calculate the current elapsed time in seconds
  const calculateElapsedTime = useCallback((): number => {
    if (!startTime) return 0;
    
    const now = Date.now();
    const start = new Date(startTime).getTime();
    const rawDuration = Math.floor((now - start) / 1000);
    const accumulatedTime = accumulatedTimeRef.current || 0;
    
    // Calculate adjusted time
    const adjustedTime = rawDuration - accumulatedTime;
    
    // Safeguard against negative values (can happen due to clock skew)
    if (adjustedTime < 0) {
      console.warn('Calculated negative time:', adjustedTime, 
        'raw:', rawDuration, 
        'accumulated:', accumulatedTime,
        'start:', new Date(start).toISOString(),
        'now:', new Date(now).toISOString());
      return 0; // Return 0 instead of negative values
    }
    
    return adjustedTime;
  }, [startTime]);
  
  // Helper to update formatted time (ensuring it's always valid)
  const updateFormattedTime = useCallback((seconds: number) => {
    // Prevent negative values
    if (seconds < 0) {
      console.warn('Preventing negative timer value:', seconds);
      seconds = 0;
    }
    
    const formatted = formatSeconds(seconds);
    setFormattedTime(formatted);
    localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, seconds.toString());
    localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatted);
    
    // If we recently resumed, make sure to remove any pause display markers
    if (wasResumedRef.current) {
      localStorage.removeItem(`sessionPauseTimeDisplay_${itemId}`);
      localStorage.removeItem(`sessionFrozenTime_${itemId}`);
    }
  }, [itemId]);
  
  // Stop the timer
  const stopTimer = useCallback(() => {
    clearTimerInterval();
    
    // Get and save the current elapsed time if we have a valid start time
    if (startTime) {
      const currentElapsed = calculateElapsedTime();
      setElapsedTime(currentElapsed);
      updateFormattedTime(currentElapsed);
      
      // Save to localStorage for persistence
      localStorage.setItem(`sessionFrozenTime_${itemId}`, currentElapsed.toString());
      console.log(`Timer stopped at ${currentElapsed} seconds`);
    }
  }, [calculateElapsedTime, clearTimerInterval, itemId, startTime, updateFormattedTime]);
  
  // Start or resume the timer
  const startTimer = useCallback(() => {
    if (!startTime || internalPaused) {
      console.log("Cannot start timer: timer is paused or no start time");
      return;
    }
    
    console.log("Starting/resuming timer...");
    
    // Clear any existing interval first
    clearTimerInterval();
    
    // CRITICAL: Always check for frozen time first when starting/resuming
    const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
    const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
    
    // If we were previously paused, use the frozen time as our starting point
    if (frozenTimeStr || pauseTimeStr) {
      let frozenTime = 0;
      
      if (frozenTimeStr) {
        // Use stored frozen time if available
        frozenTime = parseInt(frozenTimeStr, 10);
        console.log(`Starting timer from frozen time: ${frozenTime} seconds`);
      } else if (pauseTimeStr && startTime) {
        // Calculate frozen time from pause time if no frozen time available
        const pauseTime = parseInt(pauseTimeStr, 10);
        const startTimeMs = new Date(startTime).getTime();
        const accumulatedTime = accumulatedTimeRef.current || 0;
        const elapsedUntilPause = Math.floor((pauseTime - startTimeMs) / 1000) - accumulatedTime;
        frozenTime = Math.max(0, elapsedUntilPause);
        console.log(`Calculated frozen time from pause time: ${frozenTime} seconds`);
        
        // Store this for future reference
        localStorage.setItem(`sessionFrozenTime_${itemId}`, frozenTime.toString());
      }
      
      // Set the elapsed time to the frozen time (but ensure it's at least 0)
      const safeTime = Math.max(0, frozenTime);
      setElapsedTime(safeTime);
      updateFormattedTime(safeTime);
      
      // CRITICAL: For resume to work correctly, we need to adjust the accumulated time
      // to ensure the timer continues from the frozen point
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const rawElapsed = Math.floor((now - start) / 1000);
      
      // Calculate what the accumulated time should be to make elapsed time = frozen time
      const newAccumulatedTime = Math.max(0, rawElapsed - safeTime);
      console.log(`Adjusting accumulated time for resume: raw ${rawElapsed}s - frozen ${safeTime}s = ${newAccumulatedTime}s`);
      
      // Update our accumulated time
      accumulatedTimeRef.current = newAccumulatedTime;
      localStorage.setItem(`sessionAccumulatedTime_${itemId}`, newAccumulatedTime.toString());
      
      // Set the wasResumed flag to true for the next few updates
      wasResumedRef.current = true;
      
      // IMPORTANT: Force immediate updates after resume to make the timer visibly running
      // This creates a more visible timer animation effect
      const quickUpdate = () => {
        const currentElapsed = calculateElapsedTime();
        setElapsedTime(currentElapsed);
        updateFormattedTime(currentElapsed);
        setLastUpdateTime(Date.now());
      };
      
      // Schedule several quick updates to make timer movement visible
      setTimeout(quickUpdate, 100);
      setTimeout(quickUpdate, 350);
      setTimeout(quickUpdate, 600);
      setTimeout(quickUpdate, 850);
      
      // Clear wasResumed flag after delay
      setTimeout(() => {
        wasResumedRef.current = false;
        
        // Also clean up any lingering pause markers
        localStorage.removeItem(`sessionPauseTimeDisplay_${itemId}`);
      }, 5000);
    } else {
      // No frozen time - starting a fresh timer
      console.log('Starting new timer from 0');
      
      // Initialize a brand new timer starting at 0
      setElapsedTime(0);
      updateFormattedTime(0);
      
      // For a new timer, reset accumulated time
      accumulatedTimeRef.current = 0;
      localStorage.setItem(`sessionAccumulatedTime_${itemId}`, '0');
      
      // Remove any stale timer values
      localStorage.removeItem(`sessionFrozenTime_${itemId}`);
      localStorage.removeItem(`sessionPauseTimeDisplay_${itemId}`);
    }
    
    // Start a new interval with a faster update rate (250ms) for smoother updates
    console.log('Creating new timer interval');
    intervalRef.current = setInterval(() => {
      if (internalPaused) {
        // Double-check: if somehow we're paused but the interval is running, stop it
        console.log('Timer is paused but interval is running - stopping interval');
        clearTimerInterval();
        return;
      }
      
      const currentElapsed = calculateElapsedTime();
      setElapsedTime(currentElapsed);
      updateFormattedTime(currentElapsed);
      setLastUpdateTime(Date.now());
    }, 250); // Faster updates for smoother UI
    
    console.log('Timer interval started');
    
    // Force an immediate update to make sure the timer is visibly running
    const currentElapsed = calculateElapsedTime();
    setElapsedTime(currentElapsed);
    updateFormattedTime(currentElapsed);
    setLastUpdateTime(Date.now());
  }, [calculateElapsedTime, clearTimerInterval, internalPaused, itemId, startTime, updateFormattedTime]);
  
  // Effect to initialize from localStorage
  useEffect(() => {
    if (isActive && startTime) {
      console.log('Initializing timer, external pause state:', externalPaused);
      
      // IMPORTANT: First check for explicit is-paused flag
      const isPausedStr = localStorage.getItem(`sessionIsPaused_${itemId}`);
      const shouldBePaused = isPausedStr === 'true' || externalPaused;
      
      if (shouldBePaused) {
        console.log('Found explicit pause flag or externally paused state - timer should be paused');
        setInternalPaused(true);
      } else {
        // If not paused, make sure we're definitely not paused
        setInternalPaused(false);
      }
      
      // Initialize accumulated time from localStorage
      const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
      if (accumulatedTimeStr) {
        const accumulatedTime = parseInt(accumulatedTimeStr, 10);
        accumulatedTimeRef.current = accumulatedTime;
        console.log('Initialized accumulated time:', accumulatedTime, 'seconds');
      } else {
        // If no accumulated time, initialize to 0
        accumulatedTimeRef.current = 0;
        localStorage.setItem(`sessionAccumulatedTime_${itemId}`, '0');
        console.log('No accumulated time found, initialized to 0');
      }
      
      // Check if we are paused based on pause time marker
      const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
      if (pauseTimeStr || shouldBePaused) {
        // We are supposed to be paused
        console.log('Found pause time marker or should be paused - ensuring timer is paused');
        setInternalPaused(true);
        
        // Get the frozen time to display while paused
        const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
        if (frozenTimeStr) {
          const frozenTime = parseInt(frozenTimeStr, 10);
          setElapsedTime(frozenTime);
          updateFormattedTime(frozenTime);
          console.log('Set timer to frozen time:', frozenTime, 'seconds');
        } else {
          // If we don't have a frozen time yet, calculate it from the pause time
          const pauseTime = pauseTimeStr ? parseInt(pauseTimeStr, 10) : Date.now();
          const startTimeMs = new Date(startTime).getTime();
          const accumulatedTime = accumulatedTimeRef.current || 0;
          const elapsedUntilPause = Math.floor((pauseTime - startTimeMs) / 1000) - accumulatedTime;
          
          // Ensure we don't have negative time
          const safeElapsed = Math.max(0, elapsedUntilPause);
          setElapsedTime(safeElapsed);
          updateFormattedTime(safeElapsed);
          console.log('Calculated and set frozen time:', safeElapsed, 'seconds');
          
          // Store this for future reference
          localStorage.setItem(`sessionFrozenTime_${itemId}`, safeElapsed.toString());
        }
      } else {
        // Not paused - check if we have a frozen time to start from
        const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
        if (frozenTimeStr) {
          const frozenTime = parseInt(frozenTimeStr, 10);
          setElapsedTime(frozenTime);
          updateFormattedTime(frozenTime);
          console.log('Initialized elapsed time from frozen time:', frozenTime, 'seconds');
        } else {
          // No frozen time - this is likely a new session or one that should start from 0
          console.log('No frozen time found, starting timer from 0');
          setElapsedTime(0);
          updateFormattedTime(0);
          
          // Make sure to start the timer
          startTimer();
        }
      }
    }
  }, [isActive, externalPaused, itemId, startTime, updateFormattedTime, startTimer]);
  
  // Effect to sync internal paused state with external
  useEffect(() => {
    console.log('External pause state changed:', externalPaused);
    
    // If we're already paused internally, but not externally, 
    // check localStorage to see if we should still be paused
    if (internalPaused && !externalPaused) {
      const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
      if (pauseTimeStr) {
        console.log('Found pause marker in localStorage, keeping pause state');
        return; // Keep paused state
      }
    }
    
    setInternalPaused(externalPaused);
    
    // If we're now paused, make sure to save the current state
    if (externalPaused && startTime) {
      console.log('Saving pause state on external pause change');
      const currentElapsed = calculateElapsedTime();
      localStorage.setItem(`sessionFrozenTime_${itemId}`, currentElapsed.toString());
      updateFormattedTime(currentElapsed);
    }
  }, [externalPaused, calculateElapsedTime, itemId, startTime, updateFormattedTime, internalPaused]);
  
  // Effect to handle pausing
  useEffect(() => {
    if (!isActive || !startTime) return;
    
    if (internalPaused) {
      console.log('Timer is now paused');
      
      // Stop any running interval
      clearTimerInterval();
      
      // Calculate and store the currently elapsed time
      const currentElapsed = calculateElapsedTime();
      if (currentElapsed >= 0) {
        console.log('Storing frozen time on pause:', currentElapsed, 'seconds');
        localStorage.setItem(`sessionFrozenTime_${itemId}`, currentElapsed.toString());
        
        // Update the display time immediately
        updateFormattedTime(currentElapsed);
      } else {
        console.warn('Not storing negative frozen time:', currentElapsed);
        localStorage.setItem(`sessionFrozenTime_${itemId}`, '0');
        updateFormattedTime(0);
      }
    } else {
      // Start/resume the timer
      console.log('Starting timer - isPaused:', internalPaused);
      startTimer();
    }
  }, [internalPaused, isActive, startTime, startTimer, clearTimerInterval, calculateElapsedTime, updateFormattedTime, itemId]);
  
  // Main effect to manage timer based on active state
  useEffect(() => {
    if (!isActive || !startTime) {
      clearTimerInterval();
      return;
    }
    
    console.log('Main timer effect - checking if timer should be running');
    
    // Check if we need to be paused
    const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
    const isPausedStr = localStorage.getItem(`sessionIsPaused_${itemId}`);
    const shouldBePaused = isPausedStr === 'true' || !!pauseTimeStr;
    
    if (shouldBePaused) {
      if (!internalPaused) {
        console.log('Found pause markers in localStorage, forcing pause');
        setInternalPaused(true);
      }
      return;
    }
    
    // Start timer if not paused
    if (!internalPaused) {
      console.log('Timer should be running - starting interval');
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
        
        // First check for explicit pause flag
        const isPausedStr = localStorage.getItem(`sessionIsPaused_${itemId}`);
        
        // Then check for pause time marker
        const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
        
        // Determine if we should be paused based on all available information
        const shouldBePaused = isPausedStr === 'true' || !!pauseTimeStr;
        
        if (shouldBePaused) {
          // If we should be paused, make sure we're paused
          if (!internalPaused) {
            console.log('Found pause indicators on visibility change, forcing pause state');
            setInternalPaused(true);
            
            // Also restore the frozen time display
            const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
            if (frozenTimeStr) {
              const frozenTime = parseInt(frozenTimeStr, 10);
              setElapsedTime(frozenTime);
              updateFormattedTime(frozenTime);
              console.log('Restored frozen time on visibility change:', frozenTime);
            }
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
        
        if (isActive && startTime) {
          if (internalPaused) {
            // If paused, make sure the frozen time is saved
            const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
            if (!frozenTimeStr) {
              // If no frozen time exists, calculate and save it
              const currentElapsed = calculateElapsedTime();
              localStorage.setItem(`sessionFrozenTime_${itemId}`, currentElapsed.toString());
              console.log('Saved frozen time on page hide while paused:', currentElapsed);
            }
          } else {
            // If running, save current elapsed time
            const currentElapsed = calculateElapsedTime();
            updateFormattedTime(currentElapsed);
            console.log('Updated formatted time on page hide while running:', currentElapsed);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Call the handler once on mount to ensure proper state
    handleVisibilityChange();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [calculateElapsedTime, internalPaused, isActive, itemId, startTime, startTimer, updateFormattedTime]);
  
  return {
    elapsedTime,
    formattedTime,
    lastUpdateTime,
    isPaused: internalPaused,
    setIsPaused: setInternalPaused
  };
};
