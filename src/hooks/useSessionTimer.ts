import { useState, useEffect } from 'react';

interface SessionTimerProps {
  isActive: boolean;
  startTime: string | null;
}

export function useSessionTimer({ isActive, startTime }: SessionTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && startTime) {
      const start = new Date(startTime).getTime();
      
      const updateElapsedTime = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - start) / 1000);
        setElapsedTime(elapsed);
      };

      updateElapsedTime(); // Initial update
      interval = setInterval(updateElapsedTime, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, startTime]);

  const formatElapsedTime = () => {
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return { elapsedTime, formatElapsedTime };
}
