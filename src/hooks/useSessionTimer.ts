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

  // Initialize timer state based on localStorage values
  useEffect(() => {
    // Check for stored timer state
    const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
    const totalPausedTimeStr = localStorage.getItem(`sessionTotalPausedTime_${itemId}`);
    
    if (pauseTimeStr) {
      pausedAtRef.current = parseInt(pauseTimeStr, 10);
    }
    
    if (totalPausedTimeStr) {
      totalPausedTimeRef.current = parseInt(totalPausedTimeStr, 10);
    }
    
    if (startTime) {
      startTimeRef.current = new Date(startTime).getTime();
    }
    
    isRunningRef.current = isActive;
    
    // Clean up function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [itemId, startTime]);

  // Handle active/inactive state changes
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!startTimeRef.current || !validateSession()) {
      // Reset everything if there's no valid start time
      setElapsedTime(0);
      setLastUpdateTime(null);
      return;
    }

    if (isActive) {
      // If we're resuming from a paused state
      if (pausedAtRef.current) {
        const now = Date.now();
        // Calculate additional pause time since last pause
        const additionalPauseTime = now - pausedAtRef.current;
        // Add to the total
        totalPausedTimeRef.current += additionalPauseTime;
        
        // Update localStorage
        localStorage.setItem(`sessionTotalPausedTime_${itemId}`, totalPausedTimeRef.current.toString());
        
        // Clear the pause time
        pausedAtRef.current = null;
        localStorage.removeItem(`sessionPauseTime_${itemId}`);
      }
      
      // Start the timer
      const updateTimer = () => {
        if (!startTimeRef.current) return;
        
        const now = Date.now();
        // Calculate elapsed time with pause compensation
        const totalElapsed = now - startTimeRef.current;
        const adjustedElapsed = totalElapsed - totalPausedTimeRef.current;
        
        // Ensure we don't have negative time (shouldn't happen, but just in case)
        const elapsedSeconds = Math.max(0, Math.floor(adjustedElapsed / 1000));
        
        setElapsedTime(elapsedSeconds);
        setLastUpdateTime(now);
      };
      
      // Initial update
      updateTimer();
      
      // Start interval for continuous updates
      intervalRef.current = setInterval(updateTimer, 1000);
      isRunningRef.current = true;
    } else {
      // Pause the timer if it's not already paused
      if (!pausedAtRef.current) {
        pausedAtRef.current = Date.now();
        localStorage.setItem(`sessionPauseTime_${itemId}`, pausedAtRef.current.toString());
      }
      
      isRunningRef.current = false;
      
      // Important: we keep the current displayed time but don't update it anymore
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, validateSession, itemId]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only care about visibility if the timer is supposed to be running
      if (!isRunningRef.current || !startTimeRef.current) return;
      
      if (document.visibilityState === 'hidden') {
        // Tab is hidden but timer should keep running in the background
        // Record when we went to background
        localStorage.setItem(`tabHiddenTime_${itemId}`, Date.now().toString());
      } else if (document.visibilityState === 'visible') {
        // Tab is visible again
        const hiddenTimeStr = localStorage.getItem(`tabHiddenTime_${itemId}`);
        if (hiddenTimeStr && isRunningRef.current) {
          const hiddenTime = parseInt(hiddenTimeStr, 10);
          const now = Date.now();
          
          // Update the UI immediately to prevent stale time display
          if (startTimeRef.current) {
            const totalElapsed = now - startTimeRef.current;
            const adjustedElapsed = totalElapsed - totalPausedTimeRef.current;
            const elapsedSeconds = Math.max(0, Math.floor(adjustedElapsed / 1000));
            
            setElapsedTime(elapsedSeconds);
            setLastUpdateTime(now);
          }
          
          // Remove the hidden time marker
          localStorage.removeItem(`tabHiddenTime_${itemId}`);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [itemId]);

  // Format elapsed time as HH:MM:SS
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
