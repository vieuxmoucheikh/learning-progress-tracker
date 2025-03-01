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

  // Load saved elapsed time on mount and when itemId changes
  useEffect(() => {
    const loadSavedElapsedTime = () => {
      const savedElapsedTimeStr = localStorage.getItem(`sessionPauseElapsedTime_${itemId}`);
      if (savedElapsedTimeStr) {
        const savedElapsedTime = parseInt(savedElapsedTimeStr, 10);
        if (!isNaN(savedElapsedTime)) {
          setElapsedTime(savedElapsedTime);
          return true;
        }
      }
      return false;
    };
    
    loadSavedElapsedTime();
  }, [itemId]);

  // Core timer logic
  useEffect(() => {
    // Always clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Don't proceed if session is not active or is paused
    if (!isActive || isPaused() || !startTime || !validateSession()) {
      // If paused, make sure we're showing the correct paused time
      if (isPaused()) {
        const savedElapsedTimeStr = localStorage.getItem(`sessionPauseElapsedTime_${itemId}`);
        if (savedElapsedTimeStr) {
          const savedElapsedTime = parseInt(savedElapsedTimeStr, 10);
          if (!isNaN(savedElapsedTime)) {
            setElapsedTime(savedElapsedTime);
          }
        }
      }
      return;
    }
    
    // Get the base elapsed time (from localStorage if available)
    const savedElapsedTimeStr = localStorage.getItem(`sessionPauseElapsedTime_${itemId}`);
    const baseElapsedSeconds = savedElapsedTimeStr ? parseInt(savedElapsedTimeStr, 10) : 0;
    
    // Calculate the reference point for our timer
    const timerStartPoint = Date.now() - (baseElapsedSeconds * 1000);
    
    // Update function that will be called every second
    const updateTimer = () => {
      const now = Date.now();
      const newElapsedSeconds = Math.floor((now - timerStartPoint) / 1000);
      
      setElapsedTime(newElapsedSeconds);
      setLastUpdateTime(now);
    };
    
    // Initial update
    updateTimer();
    
    // Set up interval
    intervalRef.current = setInterval(updateTimer, 1000);
    
    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, startTime, itemId, validateSession, isPaused]);
  
  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      // If page becomes hidden and we have an active timer
      if (document.visibilityState === 'hidden' && isActive && !isPaused()) {
        // Save the current elapsed time and timestamp
        localStorage.setItem(`sessionHiddenAt_${itemId}`, Date.now().toString());
        localStorage.setItem(`sessionHiddenElapsedTime_${itemId}`, elapsedTime.toString());
      }
      // If page becomes visible again
      else if (document.visibilityState === 'visible') {
        const hiddenAtStr = localStorage.getItem(`sessionHiddenAt_${itemId}`);
        const hiddenElapsedTimeStr = localStorage.getItem(`sessionHiddenElapsedTime_${itemId}`);
        
        if (hiddenAtStr && hiddenElapsedTimeStr && isActive && !isPaused()) {
          const hiddenAt = parseInt(hiddenAtStr, 10);
          const hiddenElapsedTime = parseInt(hiddenElapsedTimeStr, 10);
          const now = Date.now();
          
          // Calculate how long the page was hidden
          const hiddenDuration = Math.floor((now - hiddenAt) / 1000);
          
          // Update the elapsed time to include the hidden duration
          const newElapsedTime = hiddenElapsedTime + hiddenDuration;
          
          // Store this as our new base elapsed time
          localStorage.setItem(`sessionPauseElapsedTime_${itemId}`, newElapsedTime.toString());
          
          // Force a reload of the timer
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          
          // The main useEffect will restart the timer with the new elapsed time
        }
        
        // Clean up
        localStorage.removeItem(`sessionHiddenAt_${itemId}`);
        localStorage.removeItem(`sessionHiddenElapsedTime_${itemId}`);
      }
    };
    
    // Add event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, itemId, isPaused, elapsedTime]);

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
