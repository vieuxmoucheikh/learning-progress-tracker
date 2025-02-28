import { useState, useEffect, useCallback } from 'react';

interface SessionTimerProps {
  isActive: boolean;
  startTime: string | null;
  itemId: string; 
}

export function useSessionTimer({ isActive, startTime, itemId }: SessionTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [pausedElapsedTime, setPausedElapsedTime] = useState<number | null>(null);

  const validateSession = useCallback(() => {
    if (!startTime) return false;
    
    const start = new Date(startTime).getTime();
    const now = Date.now();
    
    return start <= now && (now - start) < 24 * 60 * 60 * 1000;
  }, [startTime]);

  // Load saved pause time when component mounts
  useEffect(() => {
    const savedPausedTimeStr = localStorage.getItem(`sessionPauseElapsedTime_${itemId}`);
    if (savedPausedTimeStr) {
      const savedPausedTime = parseInt(savedPausedTimeStr, 10);
      if (!isNaN(savedPausedTime)) {
        setPausedElapsedTime(savedPausedTime);
      }
    }
  }, [itemId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && startTime && validateSession()) {
      // If we have a paused elapsed time, use that as our starting point
      const start = new Date(startTime).getTime();
      
      const updateElapsedTime = () => {
        const now = Date.now();
        let elapsed;
        
        if (pausedElapsedTime !== null) {
          // If we have a paused elapsed time, we're resuming from a pause
          elapsed = pausedElapsedTime + Math.floor((now - start) / 1000);
          // Clear the paused elapsed time since we're now running
          setPausedElapsedTime(null);
          localStorage.removeItem(`sessionPauseElapsedTime_${itemId}`);
        } else {
          // Normal case - calculate elapsed time from start
          elapsed = Math.floor((now - start) / 1000);
        }
        
        setElapsedTime(elapsed);
        setLastUpdateTime(now);
        
        localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
      };

      updateElapsedTime(); 
      interval = setInterval(updateElapsedTime, 1000);
    } else if (!isActive && startTime) {
      // We're paused - save the current elapsed time
      if (elapsedTime > 0) {
        setPausedElapsedTime(elapsedTime);
        localStorage.setItem(`sessionPauseElapsedTime_${itemId}`, elapsedTime.toString());
      }
      
      // Don't reset elapsed time when paused
      // This keeps the timer display showing the correct time
    } else {
      // Not active and no start time (completely stopped)
      setElapsedTime(0);
      setLastUpdateTime(null);
      setPausedElapsedTime(null);
      localStorage.removeItem(`sessionLastUpdate_${itemId}`);
      localStorage.removeItem(`sessionPauseElapsedTime_${itemId}`);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, startTime, itemId, validateSession, elapsedTime, pausedElapsedTime]);

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
