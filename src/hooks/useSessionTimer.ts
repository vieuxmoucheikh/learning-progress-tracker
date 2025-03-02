import { useState, useEffect, useCallback } from 'react';

interface SessionTimerProps {
  isActive: boolean;
  isPaused: boolean;
  startTime: string | null;
  itemId: string; 
}

export function useSessionTimer({ isActive, isPaused, startTime, itemId }: SessionTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [accumulatedTime, setAccumulatedTime] = useState(0);

  const validateSession = useCallback(() => {
    if (!startTime) return false;
    
    const start = new Date(startTime).getTime();
    const now = Date.now();
    
    return start <= now && (now - start) < 24 * 60 * 60 * 1000;
  }, [startTime]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && startTime && validateSession() && !isPaused) {
      if (lastUpdateTime === null) {
        setLastUpdateTime(Date.now());
      }

      const updateElapsedTime = () => {
        const now = Date.now();
        if (lastUpdateTime !== null) {
          const deltaSeconds = Math.floor((now - lastUpdateTime) / 1000);
          setElapsedTime(accumulatedTime + deltaSeconds);
        }
        setLastUpdateTime(now);
        localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
      };

      updateElapsedTime(); 
      interval = setInterval(updateElapsedTime, 1000);
    } else {
      if (isPaused && lastUpdateTime !== null) {
        const now = Date.now();
        const deltaSeconds = Math.floor((now - lastUpdateTime) / 1000);
        const newAccumulated = accumulatedTime + deltaSeconds;
        setElapsedTime(newAccumulated);
        setAccumulatedTime(newAccumulated);
      }
      setLastUpdateTime(null);
      localStorage.removeItem(`sessionLastUpdate_${itemId}`);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, isPaused, startTime, itemId, accumulatedTime, lastUpdateTime, validateSession]);

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
