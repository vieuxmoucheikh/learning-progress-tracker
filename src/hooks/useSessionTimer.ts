import { useState, useEffect, useCallback, useRef } from 'react';

interface SessionTimerProps {
  isActive: boolean;
  startTime: string | null;
  itemId: string; 
  isPaused?: boolean; // Add isPaused prop to control pause state
}

export function useSessionTimer({ isActive, startTime, itemId, isPaused = false }: SessionTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  // Store accumulated time for pause/resume functionality
  const [accumulatedTime, setAccumulatedTime] = useState<number>(0);
  // Use refs to track visibility state and interval
  const visibilityRef = useRef<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load any saved state from localStorage
  useEffect(() => {
    if (isActive && startTime) {
      // Load accumulated time if it exists (for resuming paused sessions)
      const savedAccumulatedTime = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
      if (savedAccumulatedTime) {
        setAccumulatedTime(parseInt(savedAccumulatedTime, 10));
      }
      
      // Load last elapsed time if it exists
      const savedElapsedTime = localStorage.getItem(`sessionElapsedTime_${itemId}`);
      if (savedElapsedTime) {
        setElapsedTime(parseInt(savedElapsedTime, 10));
      }
    }
  }, [isActive, startTime, itemId]);

  const validateSession = useCallback(() => {
    if (!startTime) return false;
    
    const start = new Date(startTime).getTime();
    const now = Date.now();
    
    return start <= now && (now - start) < 24 * 60 * 60 * 1000;
  }, [startTime]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      visibilityRef.current = isVisible;
      
      if (isActive && !isPaused && isVisible && validateSession()) {
        // Page is visible again - sync our timer with real elapsed time
        updateTimerState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, isPaused, validateSession]);

  // Calculate and update the timer state
  const updateTimerState = useCallback(() => {
    if (!startTime) return;
    
    const start = new Date(startTime).getTime();
    const now = Date.now();
    
    // If paused, we use the accumulated time which doesn't change
    // If active, we calculate current elapsed time and add accumulated time
    const elapsed = isPaused 
      ? accumulatedTime 
      : Math.floor((now - start) / 1000) + accumulatedTime;
      
    setElapsedTime(elapsed);
    setLastUpdateTime(now);
    
    // Store current state in localStorage for recovery
    localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
    localStorage.setItem(`sessionElapsedTime_${itemId}`, elapsed.toString());
    localStorage.setItem(`sessionAccumulatedTime_${itemId}`, accumulatedTime.toString());
  }, [startTime, isPaused, accumulatedTime, itemId]);

  // Save accumulated time when pausing
  useEffect(() => {
    if (isActive && startTime && isPaused && lastUpdateTime) {
      // When pausing, save the current accumulated time
      const start = new Date(startTime).getTime();
      const elapsed = Math.floor((lastUpdateTime - start) / 1000) + accumulatedTime;
      setAccumulatedTime(elapsed);
      localStorage.setItem(`sessionAccumulatedTime_${itemId}`, elapsed.toString());
    }
  }, [isPaused, isActive, startTime, lastUpdateTime, accumulatedTime, itemId]);

  // Main timer effect
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isActive && startTime && validateSession() && !isPaused) {
      // Initialize state
      updateTimerState();
      
      // Set up interval for active, non-paused timer
      intervalRef.current = setInterval(updateTimerState, 1000);
    } else if (!isActive) {
      // Reset state when inactive
      setElapsedTime(0);
      setLastUpdateTime(null);
      setAccumulatedTime(0);
      localStorage.removeItem(`sessionLastUpdate_${itemId}`);
      localStorage.removeItem(`sessionElapsedTime_${itemId}`);
      localStorage.removeItem(`sessionAccumulatedTime_${itemId}`);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, startTime, itemId, validateSession, isPaused, updateTimerState]);

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
    isValidSession: validateSession(),
    accumulatedTime
  };
}
