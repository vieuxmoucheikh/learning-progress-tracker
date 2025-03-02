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
  const intervalRef = useRef<NodeJS.Timeout | null>(null); 
  const wasRunningRef = useRef<boolean>(false); 
  
  const [internalPaused, setInternalPaused] = useState(isPaused); 
  
  useEffect(() => {
    setInternalPaused(isPaused);
  }, [isPaused]);
  
  useEffect(() => {
    const storedAccumulatedTime = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
    if (storedAccumulatedTime) {
      accumulatedTimeRef.current = parseInt(storedAccumulatedTime, 10);
    }
    
    const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
    if (pauseTimeStr) {
      setInternalPaused(true);
    }
  }, [itemId]);

  const validateSession = useCallback(() => {
    if (!startTime) return false;
    
    const start = new Date(startTime).getTime();
    const now = Date.now();
    
    return start <= now && (now - start) < 24 * 60 * 60 * 1000;
  }, [startTime]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
        const isPausedNow = !!pauseTimeStr;
        setInternalPaused(isPausedNow);
        
        if (!isPausedNow) {
          const storedAccumulatedTime = localStorage.getItem(`sessionAccumulatedTime_${itemId}`);
          
          if (storedAccumulatedTime) {
            accumulatedTimeRef.current = parseInt(storedAccumulatedTime, 10);
          }
          
          if (startTime) {
            const start = new Date(startTime).getTime();
            const now = Date.now();
            
            const elapsed = Math.floor((now - start) / 1000) - accumulatedTimeRef.current;
            setElapsedTime(elapsed);
            setLastUpdateTime(now);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, itemId, startTime]);

  useEffect(() => {
    if (isActive && internalPaused && startTime) {
      console.log('Timer paused');
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
      if (pauseTimeStr) {
        const pauseTime = parseInt(pauseTimeStr, 10);
        const start = new Date(startTime).getTime();
        
        const elapsedUntilPause = Math.floor((pauseTime - start) / 1000) - accumulatedTimeRef.current;
        
        setElapsedTime(elapsedUntilPause);
        
        console.log('Timer frozen at:', elapsedUntilPause, 'seconds');
      }
      
      wasRunningRef.current = true;
    }
  }, [internalPaused, isActive, itemId, startTime]);

  useEffect(() => {
    if (isActive && !internalPaused && wasRunningRef.current && startTime) {
      console.log('Timer resuming');
      
      const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
      
      if (pauseTimeStr) {
        const pauseTime = parseInt(pauseTimeStr, 10);
        const now = Date.now();
        
        const pauseDuration = Math.floor((now - pauseTime) / 1000);
        accumulatedTimeRef.current += pauseDuration;
        
        console.log('Adding pause duration:', pauseDuration, 'seconds, total accumulated:', accumulatedTimeRef.current);
        
        localStorage.setItem(`sessionAccumulatedTime_${itemId}`, accumulatedTimeRef.current.toString());
      }
      
      wasRunningRef.current = false;
    }
  }, [internalPaused, isActive, itemId, startTime]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isActive && !internalPaused && startTime && validateSession()) {
      console.log('Starting timer interval');
      
      const start = new Date(startTime).getTime();
      
      const updateElapsedTime = () => {
        const pauseTimeStr = localStorage.getItem(`sessionPauseTime_${itemId}`);
        if (pauseTimeStr) {
          setInternalPaused(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        const now = Date.now();
        const elapsed = Math.floor((now - start) / 1000) - accumulatedTimeRef.current;
        setElapsedTime(elapsed);
        setLastUpdateTime(now);
        
        localStorage.setItem(`sessionLastUpdate_${itemId}`, now.toString());
      };
      
      updateElapsedTime();
      intervalRef.current = setInterval(updateElapsedTime, 1000);
    } 
    else if (!isActive) {
      setElapsedTime(0);
      setLastUpdateTime(null);
      accumulatedTimeRef.current = 0;
      wasRunningRef.current = false;
      
      localStorage.removeItem(`sessionLastUpdate_${itemId}`);
      localStorage.removeItem(`sessionPauseTime_${itemId}`);
      localStorage.removeItem(`sessionAccumulatedTime_${itemId}`);
      
      console.log('Timer reset');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, internalPaused, startTime, itemId, validateSession]);

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
