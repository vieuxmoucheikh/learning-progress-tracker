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
  const hiddenTimestampRef = useRef<number | null>(null);
  const initializedRef = useRef<boolean>(false);
  const startTimeRef = useRef<number | null>(null);
  
  // Clear any existing interval
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('Timer interval cleared');
    }
  }, []);
  
  // Initialize or update the start time reference
  useEffect(() => {
    if (startTime) {
      const parsedStartTime = new Date(startTime).getTime();
      startTimeRef.current = parsedStartTime;
      console.log('Set startTimeRef to:', new Date(parsedStartTime).toISOString());
    } else {
      startTimeRef.current = null;
    }
  }, [startTime]);
  
  // Reset accumulated time when starting a new session
  useEffect(() => {
    if (isActive && startTime && !initializedRef.current) {
      // Check if this is a brand new session (not just a component remount)
      const storedStartTime = localStorage.getItem(`sessionStartTime_${itemId}`);
      
      if (!storedStartTime || storedStartTime !== startTime) {
        console.log('New session detected, resetting accumulated time');
        accumulatedTimeRef.current = 0;
        localStorage.setItem(`sessionAccumulatedTime_${itemId}`, '0');
        localStorage.setItem(`sessionStartTime_${itemId}`, startTime);
      }
    }
  }, [isActive, startTime, itemId]);
  
  // Helper to calculate the current elapsed time in seconds
  const calculateElapsedTime = useCallback((): number => {
    if (!startTime || !startTimeRef.current) return 0;
    
    const now = Date.now();
    const start = startTimeRef.current;
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
  }, [itemId]);
  
  // Helper to store pause time in localStorage
  const storePauseTime = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(`sessionPauseTime_${itemId}`, now.toString());
    localStorage.setItem(`sessionIsPaused_${itemId}`, 'true');
    
    // Store the current elapsed time as frozen time
    const currentElapsed = calculateElapsedTime();
    const safeElapsed = Math.max(0, currentElapsed);
    localStorage.setItem(`sessionFrozenTime_${itemId}`, safeElapsed.toString());
    
    console.log('Stored pause time:', now, 'with frozen time:', safeElapsed);
    
    return safeElapsed;
  }, [calculateElapsedTime, itemId]);
  
  // CRITICAL: This effect handles the timer interval based on pause state
  useEffect(() => {
    // If not active or no start time, don't do anything
    if (!isActive || !startTime) {
      clearTimerInterval();
      return;
    }
    
    // IMPORTANT: Check if we should be paused
    if (internalPaused) {
      console.log('Timer is paused - ensuring interval is cleared');
      
      // Stop any running interval
      clearTimerInterval();
      
      // If we're newly paused, store the pause time
      if (!localStorage.getItem(`sessionPauseTime_${itemId}`)) {
        const safeElapsed = storePauseTime();
        setElapsedTime(safeElapsed);
        updateFormattedTime(safeElapsed);
      } else {
        // Get the frozen time to display
        const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
        if (frozenTimeStr) {
          const frozenTime = parseInt(frozenTimeStr, 10);
          setElapsedTime(frozenTime);
          updateFormattedTime(frozenTime);
          console.log('Using frozen time while paused:', frozenTime);
        } else {
          // If no frozen time exists, calculate and store it
          const currentElapsed = calculateElapsedTime();
          const safeElapsed = Math.max(0, currentElapsed);
          setElapsedTime(safeElapsed);
          updateFormattedTime(safeElapsed);
          localStorage.setItem(`sessionFrozenTime_${itemId}`, safeElapsed.toString());
          console.log('Created new frozen time while paused:', safeElapsed);
        }
      }
      
      // We return here to prevent starting the interval
      return;
    }
    
    // If we get here, we're active and not paused, so we should be running
    console.log('Timer should be running - starting interval');
    
    // Clear any existing interval first
    clearTimerInterval();
    
    // Start a new interval
    intervalRef.current = setInterval(() => {
      const currentElapsed = calculateElapsedTime();
      setElapsedTime(currentElapsed);
      updateFormattedTime(currentElapsed);
      setLastUpdateTime(Date.now());
    }, 250);
    
    console.log('Timer interval started');
    
    // Force an immediate update
    const currentElapsed = calculateElapsedTime();
    setElapsedTime(currentElapsed);
    updateFormattedTime(currentElapsed);
    setLastUpdateTime(Date.now());
    
    // Cleanup on unmount or when dependencies change
    return () => {
      clearTimerInterval();
    };
  }, [isActive, internalPaused, startTime, itemId, clearTimerInterval, calculateElapsedTime, updateFormattedTime, storePauseTime]);
  
  // Effect to sync internal paused state with external
  useEffect(() => {
    console.log('External pause state changed:', externalPaused);
    
    // Update internal state to match external state
    setInternalPaused(externalPaused);
    
    // If paused, calculate and store the current elapsed time
    if (externalPaused && startTime) {
      const safeElapsed = storePauseTime();
      setElapsedTime(safeElapsed);
      updateFormattedTime(safeElapsed);
    }
  }, [externalPaused, startTime, storePauseTime, updateFormattedTime]);
  
  // Effect to initialize from localStorage when the component mounts
  useEffect(() => {
    if (!isActive || !startTime || initializedRef.current) return;
    
    console.log('Initializing timer state');
    initializedRef.current = true;
    
    // Store the start time for reference
    localStorage.setItem(`sessionStartTime_${itemId}`, startTime);
    
    // Check if we should be paused
    const isPausedStr = localStorage.getItem(`sessionIsPaused_${itemId}`);
    const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
    const shouldBePaused = isPausedStr === 'true' || !!pauseTimeStr || externalPaused;
    
    // Initialize accumulated time
    const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
    if (accumulatedTimeStr) {
      const accumulatedTime = parseInt(accumulatedTimeStr, 10);
      accumulatedTimeRef.current = accumulatedTime;
      console.log('Initialized accumulated time:', accumulatedTime);
    } else {
      accumulatedTimeRef.current = 0;
      localStorage.setItem(`sessionAccumulatedTime_${itemId}`, '0');
      console.log('Reset accumulated time to 0');
    }
    
    if (shouldBePaused) {
      console.log('Timer should be paused on initialization');
      setInternalPaused(true);
      
      // Get the frozen time to display
      const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
      if (frozenTimeStr) {
        const frozenTime = parseInt(frozenTimeStr, 10);
        setElapsedTime(frozenTime);
        updateFormattedTime(frozenTime);
        console.log('Using frozen time on init:', frozenTime);
      } else {
        // If no frozen time exists but we should be paused, calculate it
        const pauseTime = pauseTimeStr ? parseInt(pauseTimeStr, 10) : Date.now();
        const startTimeMs = new Date(startTime).getTime();
        
        // Calculate elapsed time at pause point
        const elapsedUntilPause = Math.floor((pauseTime - startTimeMs) / 1000) - accumulatedTimeRef.current;
        const safeElapsed = Math.max(0, elapsedUntilPause);
        
        setElapsedTime(safeElapsed);
        updateFormattedTime(safeElapsed);
        localStorage.setItem(`sessionFrozenTime_${itemId}`, safeElapsed.toString());
        console.log('Calculated frozen time on init:', safeElapsed);
      }
    } else {
      // Force an initial update
      const currentElapsed = calculateElapsedTime();
      setElapsedTime(currentElapsed);
      updateFormattedTime(currentElapsed);
      console.log('Initialized running timer at:', currentElapsed);
    }
  }, [isActive, startTime, externalPaused, itemId, calculateElapsedTime, updateFormattedTime, storePauseTime]);
  
  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('Page hidden - storing timestamp');
        
        // Store the current timestamp when the page becomes hidden
        hiddenTimestampRef.current = Date.now();
        
        // Store the current elapsed time in localStorage for recovery
        const currentElapsed = calculateElapsedTime();
        localStorage.setItem(`sessionHiddenElapsedTime_${itemId}`, currentElapsed.toString());
        localStorage.setItem(`sessionHiddenTimestamp_${itemId}`, Date.now().toString());
        
        // We don't stop the timer when the page is hidden
        // This allows the timer to continue running in the background
      } else if (document.visibilityState === 'visible') {
        console.log('Page visible again');
        
        // Check if we should be paused
        const isPausedStr = localStorage.getItem(`sessionIsPaused_${itemId}`);
        const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
        const shouldBePaused = isPausedStr === 'true' || !!pauseTimeStr;
        
        if (!shouldBePaused && hiddenTimestampRef.current !== null && !internalPaused) {
          // If the timer was running when the page was hidden, sync the elapsed time
          const hiddenTime = hiddenTimestampRef.current;
          const visibleTime = Date.now();
          const hiddenDuration = visibleTime - hiddenTime;
          
          console.log(`Page was hidden for ${hiddenDuration}ms`);
          
          // Force an immediate update to sync the timer
          const currentElapsed = calculateElapsedTime();
          setElapsedTime(currentElapsed);
          updateFormattedTime(currentElapsed);
          setLastUpdateTime(Date.now());
          
          // Reset the hidden timestamp
          hiddenTimestampRef.current = null;
        } else if (shouldBePaused && !internalPaused) {
          console.log('Found pause markers on visibility change, forcing pause');
          setInternalPaused(true);
        } else if (!shouldBePaused && internalPaused) {
          console.log('No pause markers but paused internally, resuming');
          setInternalPaused(false);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Call once on mount
    handleVisibilityChange();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [internalPaused, itemId, calculateElapsedTime, updateFormattedTime]);
  
  // Handle resuming a session
  const handleResume = useCallback(() => {
    if (!startTime || !internalPaused) return;
    
    console.log('Handling resume for session:', itemId);
    
    // Get pause time
    const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
    if (pauseTimeStr) {
      const pauseTime = parseInt(pauseTimeStr, 10);
      const now = Date.now();
      const pauseDuration = Math.floor((now - pauseTime) / 1000);
      
      // Add pause duration to accumulated time
      const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
      const accumulatedTime = accumulatedTimeStr ? parseInt(accumulatedTimeStr, 10) : 0;
      const newAccumulatedTime = accumulatedTime + pauseDuration;
      
      // Update accumulated time
      accumulatedTimeRef.current = newAccumulatedTime;
      localStorage.setItem(`sessionAccumulatedTime_${itemId}`, newAccumulatedTime.toString());
      console.log(`Updated accumulated time: ${accumulatedTime} + ${pauseDuration} = ${newAccumulatedTime}`);
    } else {
      console.warn('No pause time found when resuming session');
    }
    
    // Clear pause markers
    localStorage.removeItem(`sessionPauseTime_${itemId}`);
    localStorage.removeItem(`sessionPauseTimeDisplay_${itemId}`);
    localStorage.removeItem(`sessionIsPaused_${itemId}`);
    localStorage.removeItem(`sessionFrozenTime_${itemId}`);
    
    // Set the wasResumed flag to true
    wasResumedRef.current = true;
    
    // Resume the timer
    setInternalPaused(false);
    
    // Force an immediate update to sync the timer
    const currentElapsed = calculateElapsedTime();
    setElapsedTime(currentElapsed);
    updateFormattedTime(currentElapsed);
    setLastUpdateTime(Date.now());
    
    console.log('Timer resumed at:', currentElapsed);
  }, [internalPaused, itemId, startTime, calculateElapsedTime, updateFormattedTime]);
  
  return {
    elapsedTime,
    formattedTime,
    lastUpdateTime,
    isPaused: internalPaused,
    setIsPaused: setInternalPaused,
    handleResume
  };
};
