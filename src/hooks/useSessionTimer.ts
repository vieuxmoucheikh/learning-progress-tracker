import { useState, useEffect, useCallback, useRef } from 'react';

interface TimerProps {
  isActive: boolean;
  startTime: string | null;
  externalPaused?: boolean;
  itemId: string;
}

const formatElapsedTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
};

/**
 * Custom hook for managing session timer with persistent state
 */
const useSessionTimer = ({ isActive, startTime, externalPaused = false, itemId }: TimerProps) => {
  // State for the timer
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [formattedTime, setFormattedTime] = useState<string>('00:00:00');
  const [internalPaused, setInternalPaused] = useState<boolean>(externalPaused);
  
  // Refs to track time across renders and handle visibility changes
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityChangeTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  
  // Format seconds into HH:MM:SS
  const updateFormattedTime = useCallback((seconds: number) => {
    const safeSeconds = Math.max(0, seconds); // Ensure no negative time
    const formatted = formatElapsedTime(safeSeconds);
    setFormattedTime(formatted);
    
    // Also save this in localStorage for persistence
    localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, safeSeconds.toString());
    localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatted);
  }, [itemId]);
  
  // Calculate the current elapsed time based on start time and accumulated time
  const calculateElapsedTime = useCallback(() => {
    // If we're not active or there's no start time, just return the current elapsed time
    if (!isActive || !startTime) return elapsedTime;
    
    // Handle paused state - return frozen time if available
    if (internalPaused) {
      const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
      if (frozenTimeStr) {
        return parseInt(frozenTimeStr, 10);
      }
    }
    
    // Calculate based on current time
    const startTimeMs = startTimeRef.current || new Date(startTime).getTime();
    const now = Date.now();
    const accumulated = accumulatedTimeRef.current || 0;
    
    // Calculate time: (current time - start time) / 1000 to get seconds, minus accumulated paused time
    return Math.max(0, Math.floor((now - startTimeMs) / 1000) - accumulated);
  }, [isActive, startTime, internalPaused, itemId, elapsedTime]);
  
  // Clear interval and other cleanup
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      console.log('Clearing timer interval');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Start the timer interval
  const startTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearTimerInterval();
    }
    
    console.log('Starting timer interval');
    intervalRef.current = setInterval(() => {
      const elapsed = calculateElapsedTime();
      setElapsedTime(elapsed);
      updateFormattedTime(elapsed);
      
      // Update the last update timestamp
      localStorage.setItem(`sessionLastUpdate_${itemId}`, Date.now().toString());
    }, 1000);
  }, [calculateElapsedTime, clearTimerInterval, updateFormattedTime, itemId]);
  
  // Effect to initialize timer when component mounts or active state changes
  useEffect(() => {
    // Only initialize if we're active and have a start time
    if (isActive && startTime) {
      console.log('Initializing timer...');
      
      // Initialize the start time reference
      if (!startTimeRef.current) {
        startTimeRef.current = new Date(startTime).getTime();
      }
      
      // Check if we are supposed to be paused
      const isPausedFlag = localStorage.getItem(`sessionIsPaused_${itemId}`) === 'true';
      const hasPauseMarker = !!localStorage.getItem(`sessionPauseTime_${itemId}`);
      const shouldBePaused = isPausedFlag || externalPaused || hasPauseMarker;
      
      if (shouldBePaused) {
        console.log('Timer should be paused on init');
        setInternalPaused(true);
        
        // Get frozen time from localStorage
        const frozenTimeStr = localStorage.getItem(`sessionFrozenTime_${itemId}`);
        if (frozenTimeStr) {
          const frozenTime = parseInt(frozenTimeStr, 10);
          setElapsedTime(frozenTime);
          updateFormattedTime(frozenTime);
          console.log('Restored frozen time:', frozenTime);
        } else {
          // Calculate frozen time from pause time if available
          const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
          if (pauseTimeStr) {
            const pauseTime = parseInt(pauseTimeStr, 10);
            const startMs = new Date(startTime).getTime();
            const accumulated = accumulatedTimeRef.current || 0;
            const elapsedUntilPause = Math.max(0, Math.floor((pauseTime - startMs) / 1000) - accumulated);
            
            setElapsedTime(elapsedUntilPause);
            updateFormattedTime(elapsedUntilPause);
            localStorage.setItem(`sessionFrozenTime_${itemId}`, elapsedUntilPause.toString());
            console.log('Calculated frozen time:', elapsedUntilPause);
          }
        }
      } else {
        // Not paused - start the timer and initialize from last known elapsed time
        console.log('Timer should start (not paused)');
        
        // Check if we have accumulated pause time
        const accumulatedTimeStr = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
        if (accumulatedTimeStr) {
          accumulatedTimeRef.current = parseInt(accumulatedTimeStr, 10);
          console.log('Restored accumulated pause time:', accumulatedTimeRef.current);
        }
        
        // Calculate current elapsed time
        const elapsed = calculateElapsedTime();
        setElapsedTime(elapsed);
        updateFormattedTime(elapsed);
        
        // Start interval
        startTimerInterval();
      }
      
      // Register document visibility change event
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Page is now hidden - record time and pause the interval
          visibilityChangeTimeRef.current = Date.now();
          clearTimerInterval();
        } else {
          // Page is now visible again
          if (visibilityChangeTimeRef.current && !internalPaused) {
            // Only adjust time if we're not already paused
            const now = Date.now();
            const elapsed = calculateElapsedTime();
            setElapsedTime(elapsed);
            updateFormattedTime(elapsed);
            
            // Restart the timer interval
            startTimerInterval();
          }
          visibilityChangeTimeRef.current = null;
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Cleanup function
      return () => {
        clearTimerInterval();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      // Not active - clean up
      clearTimerInterval();
    }
  }, [isActive, startTime, externalPaused, itemId, clearTimerInterval, startTimerInterval, calculateElapsedTime, updateFormattedTime]);
  
  // Effect to handle pause state changes
  useEffect(() => {
    if (internalPaused) {
      // Paused - stop the timer
      clearTimerInterval();
      
      // Ensure we have frozen time stored
      const elapsed = calculateElapsedTime();
      localStorage.setItem(`sessionFrozenTime_${itemId}`, elapsed.toString());
      updateFormattedTime(elapsed);
    } else if (isActive && startTime) {
      // Not paused and active - start the timer
      startTimerInterval();
    }
  }, [internalPaused, isActive, startTime, clearTimerInterval, startTimerInterval, calculateElapsedTime, updateFormattedTime, itemId]);
  
  // Effect to sync with external pause state changes
  useEffect(() => {
    // Always sync to external pause state when it changes
    setInternalPaused(externalPaused);
  }, [externalPaused]);
  
  // Function to manually set pause state
  const setIsPaused = useCallback((paused: boolean) => {
    setInternalPaused(paused);
    
    if (paused) {
      // Ensure we record pause time
      localStorage.setItem(`sessionIsPaused_${itemId}`, 'true');
      
      // Record current elapsed time as frozen time
      const elapsed = calculateElapsedTime();
      localStorage.setItem(`sessionFrozenTime_${itemId}`, elapsed.toString());
      
      // Update formatted time
      updateFormattedTime(elapsed);
    } else {
      // Remove pause flag
      localStorage.removeItem(`sessionIsPaused_${itemId}`);
      
      // If we have a pause time, calculate accumulated time
      const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
      const resumeTime = Date.now();
      
      if (pauseTimeStr) {
        const pauseTime = parseInt(pauseTimeStr, 10);
        const pauseDuration = Math.floor((resumeTime - pauseTime) / 1000);
        
        // Update accumulated time
        const currentAccumulated = accumulatedTimeRef.current || 0;
        const newAccumulated = currentAccumulated + pauseDuration;
        accumulatedTimeRef.current = newAccumulated;
        
        // Store for persistence
        localStorage.setItem(`sessionAccumulatedTime_${itemId}`, newAccumulated.toString());
        
        // Remove pause time marker
        localStorage.removeItem(`sessionPauseTime_${itemId}`);
        console.log(`Resumed after ${pauseDuration}s pause, total accumulated: ${newAccumulated}s`);
      }
    }
  }, [calculateElapsedTime, updateFormattedTime, itemId]);
  
  return {
    elapsedTime,
    formattedTime,
    isPaused: internalPaused,
    setIsPaused
  };
};

export { useSessionTimer, formatElapsedTime };
