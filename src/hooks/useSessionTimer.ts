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
  const wasActiveRef = useRef<boolean>(false);
  
  // Check if there's a paused session
  const isPaused = useCallback(() => {
    const pausedTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
    return !!pausedTimeStr;
  }, [itemId]);

  const validateSession = useCallback(() => {
    if (!startTime) return false;
    
    const start = new Date(startTime).getTime();
    const now = Date.now();
    
    return start <= now && (now - start) < 24 * 60 * 60 * 1000;
  }, [startTime]);

  // Load saved elapsed time when component mounts
  useEffect(() => {
    const savedElapsedTimeStr = localStorage.getItem(`sessionPauseElapsedTime_${itemId}`);
    if (savedElapsedTimeStr) {
      const savedElapsedTime = parseInt(savedElapsedTimeStr, 10);
      if (!isNaN(savedElapsedTime)) {
        setElapsedTime(savedElapsedTime);
      }
    }
  }, [itemId]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wasActiveRef.current && isActive) {
        // Page is visible again and the session was active before
        // Update the timer to account for the time the page was hidden
        const lastVisibleTimeStr = localStorage.getItem(`sessionLastVisibleTime_${itemId}`);
        if (lastVisibleTimeStr) {
          const lastVisibleTime = parseInt(lastVisibleTimeStr, 10);
          const now = Date.now();
          
          // If the page was hidden for more than 5 seconds
          if (now - lastVisibleTime > 5000) {
            // Restart the timer with the adjusted time
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            
            // Start the timer again
            const updateElapsedTime = () => {
              const currentTime = Date.now();
              const savedElapsedTimeStr = localStorage.getItem(`sessionPauseElapsedTime_${itemId}`);
              const baseElapsedTime = savedElapsedTimeStr ? parseInt(savedElapsedTimeStr, 10) : elapsedTime;
              
              setElapsedTime(baseElapsedTime + Math.floor((currentTime - now) / 1000));
              setLastUpdateTime(currentTime);
            };
            
            // Initial update
            updateElapsedTime();
            
            // Start interval
            intervalRef.current = setInterval(updateElapsedTime, 1000);
          }
        }
      }
    };
    
    // Add event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Update wasActiveRef
    wasActiveRef.current = isActive && !isPaused();
    
    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, itemId, isPaused, elapsedTime]);

  // Start or stop the timer based on active status and pause state
  useEffect(() => {
    // Always clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Check if we're paused
    const paused = isPaused();

    // If we're paused, load the saved elapsed time and don't start the timer
    if (paused) {
      const savedElapsedTimeStr = localStorage.getItem(`sessionPauseElapsedTime_${itemId}`);
      if (savedElapsedTimeStr) {
        const savedElapsedTime = parseInt(savedElapsedTimeStr, 10);
        if (!isNaN(savedElapsedTime)) {
          setElapsedTime(savedElapsedTime);
        }
      }
      return; // Exit early - don't start the timer
    }

    // Only start a new interval if the session is active and not paused
    if (isActive && startTime && validateSession()) {
      const startTimeMs = new Date(startTime).getTime();
      const savedElapsedTimeStr = localStorage.getItem(`sessionPauseElapsedTime_${itemId}`);
      const initialElapsedSeconds = savedElapsedTimeStr ? parseInt(savedElapsedTimeStr, 10) : 0;
      
      // If we're resuming from a pause, we need to adjust the start time
      const adjustedStartTime = initialElapsedSeconds > 0 
        ? Date.now() - (initialElapsedSeconds * 1000) 
        : startTimeMs;
      
      const updateElapsedTime = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - adjustedStartTime) / 1000);
        
        setElapsedTime(elapsed);
        setLastUpdateTime(now);
        
        localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
        
        // Clear the pause elapsed time since we're now running
        if (initialElapsedSeconds > 0) {
          localStorage.removeItem(`sessionPauseElapsedTime_${itemId}`);
        }
      };

      // Initial update
      updateElapsedTime();
      
      // Start interval
      intervalRef.current = setInterval(updateElapsedTime, 1000);
      
      // Update wasActiveRef
      wasActiveRef.current = true;
    } 
    // If we're completely stopped, reset everything
    else if (!isActive && !startTime) {
      setElapsedTime(0);
      setLastUpdateTime(null);
      localStorage.removeItem(`sessionLastUpdate_${itemId}`);
      localStorage.removeItem(`sessionPauseElapsedTime_${itemId}`);
      
      // Update wasActiveRef
      wasActiveRef.current = false;
    }

    // Clean up on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, startTime, itemId, validateSession, isPaused]);

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
    isValidSession: validateSession(),
    isPaused: isPaused()
  };
}
