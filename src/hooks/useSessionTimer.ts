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
  const pauseTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const storedAccumulatedTime = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
    if (storedAccumulatedTime) {
      accumulatedTimeRef.current = parseInt(storedAccumulatedTime, 10);
    }
  }, [itemId]);

  const validateSession = useCallback(() => {
    if (!startTime) return false;
    
    const start = new Date(startTime).getTime();
    const now = Date.now();
    
    return start <= now && (now - start) < 24 * 60 * 60 * 1000;
  }, [startTime]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && !isPaused) {
        const now = Date.now();
        localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
        setLastUpdateTime(now);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, isPaused, itemId]);

  useEffect(() => {
    if (isPaused && isActive) {
      const pauseTime = Date.now();
      pauseTimeRef.current = pauseTime;
      localStorage.setItem(`sessionPauseTime_${itemId}`, pauseTime.toString());
    } else if (!isPaused && isActive) {
      const storedPauseTime = pauseTimeRef.current || 
        parseInt(localStorage.getItem(`sessionPauseTime_${itemId}`) || '0', 10);
      
      if (storedPauseTime) {
        const now = Date.now();
        const pauseDuration = Math.floor((now - storedPauseTime) / 1000);
        
        accumulatedTimeRef.current += pauseDuration;
        localStorage.setItem(`sessionAccumulatedTime_${itemId}`, accumulatedTimeRef.current.toString());
        
        pauseTimeRef.current = null;
        localStorage.removeItem(`sessionPauseTime_${itemId}`);
      }
    }
  }, [isPaused, isActive, itemId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && startTime && validateSession() && !isPaused) {
      const start = new Date(startTime).getTime();
      
      const updateElapsedTime = () => {
        const now = Date.now();
        const rawElapsed = Math.floor((now - start) / 1000);
        const adjusted = Math.max(0, rawElapsed - accumulatedTimeRef.current);
        
        setElapsedTime(adjusted);
        setLastUpdateTime(now);
        
        localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
      };

      updateElapsedTime(); 
      interval = setInterval(updateElapsedTime, 1000);
    } else if (!isActive) {
      setElapsedTime(0);
      setLastUpdateTime(null);
      accumulatedTimeRef.current = 0;
      pauseTimeRef.current = null;
      localStorage.removeItem(`sessionLastUpdate_${itemId}`);
      localStorage.removeItem(`sessionAccumulatedTime_${itemId}`);
      localStorage.removeItem(`sessionPauseTime_${itemId}`);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, startTime, itemId, validateSession, isPaused]);

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
