import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

// Helper function to format seconds as HH:MM:SS
const formatSeconds = (seconds: number): string => {
  // Ensure seconds is a positive number
  seconds = Math.max(0, seconds);
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

interface WorkerPomodoroTimerProps {
  isActive: boolean;
  startTime: string | null;
  itemId: string;
  onComplete?: () => void;
}

export const WorkerPomodoroTimer: React.FC<WorkerPomodoroTimerProps> = ({
  isActive,
  startTime,
  itemId,
  onComplete
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [formattedTime, setFormattedTime] = useState('00:00:00');
  
  // References
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);

  // Load initial state from localStorage
  useEffect(() => {
    if (isActive) {
      try {
        // Check if we should restore pause state from localStorage
        const storedIsPaused = localStorage.getItem(`sessionIsPaused_${itemId}`);
        if (storedIsPaused === 'true') {
          setIsPaused(true);
          pausedAtRef.current = Date.now();
        }
        
        // Try to restore elapsed time from localStorage
        const storedElapsedStr = localStorage.getItem(`sessionCurrentTimeSeconds_${itemId}`);
        if (storedElapsedStr) {
          const storedElapsed = parseInt(storedElapsedStr, 10);
          elapsedBeforePauseRef.current = storedElapsed;
          setElapsedTime(storedElapsed);
          setFormattedTime(formatSeconds(storedElapsed));
        }
      } catch (e) {
        console.error('Error restoring timer state from localStorage:', e);
      }
    }
  }, [isActive, itemId]);
  
  // Start/stop timer based on active state
  useEffect(() => {
    const clearExistingInterval = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    
    const startTimer = () => {
      clearExistingInterval();
      
      // Initialize start time if not set
      if (startTimeRef.current === null) {
        startTimeRef.current = startTime ? new Date(startTime).getTime() : Date.now();
      }
      
      // Set up interval to update elapsed time
      intervalRef.current = window.setInterval(() => {
        if (pausedAtRef.current) {
          // If paused, don't update elapsed time
          return;
        }
        
        const now = Date.now();
        const timeSinceStart = now - startTimeRef.current!;
        const totalElapsedSeconds = Math.floor(timeSinceStart / 1000) + elapsedBeforePauseRef.current;
        
        setElapsedTime(totalElapsedSeconds);
        setFormattedTime(formatSeconds(totalElapsedSeconds));
        
        // Periodically save to localStorage for persistence
        try {
          localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, totalElapsedSeconds.toString());
          localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatSeconds(totalElapsedSeconds));
          localStorage.setItem(`sessionLastUpdateTime_${itemId}`, now.toString());
        } catch (e) {
          console.error('Error saving timer state to localStorage:', e);
        }
      }, 1000);
    };
    
    const stopTimer = () => {
      clearExistingInterval();
      
      // Reset timer state
      startTimeRef.current = null;
      pausedAtRef.current = null;
      elapsedBeforePauseRef.current = 0;
      
      // Reset UI state
      setElapsedTime(0);
      setFormattedTime('00:00:00');
      
      // Clean up localStorage
      try {
        localStorage.removeItem(`sessionCurrentTimeSeconds_${itemId}`);
        localStorage.removeItem(`sessionCurrentTimeFormatted_${itemId}`);
        localStorage.removeItem(`sessionLastUpdateTime_${itemId}`);
        localStorage.removeItem(`sessionIsPaused_${itemId}`);
        localStorage.removeItem(`sessionPauseTime_${itemId}`);
      } catch (e) {
        console.error('Error cleaning up localStorage:', e);
      }
    };
    
    if (isActive && startTime) {
      startTimer();
    } else {
      stopTimer();
    }
    
    return clearExistingInterval;
  }, [isActive, startTime, itemId]);
  
  // Handle pause/resume
  useEffect(() => {
    if (!isActive) return;
    
    if (isPaused) {
      // Pause timer
      pausedAtRef.current = Date.now();
      
      // If we have a start time, calculate elapsed time up to now and store it
      if (startTimeRef.current !== null) {
        const pausedElapsedSeconds = Math.floor((pausedAtRef.current - startTimeRef.current) / 1000);
        elapsedBeforePauseRef.current += pausedElapsedSeconds;
        startTimeRef.current = null;
      }
      
      // Save pause state to localStorage
      try {
        localStorage.setItem(`sessionIsPaused_${itemId}`, 'true');
        localStorage.setItem(`sessionPauseTime_${itemId}`, pausedAtRef.current.toString());
        localStorage.setItem(`sessionElapsedBeforePause_${itemId}`, elapsedBeforePauseRef.current.toString());
      } catch (e) {
        console.error('Error saving pause state to localStorage:', e);
      }
    } else {
      // Resume timer
      if (pausedAtRef.current !== null) {
        // Resume from where we left off
        startTimeRef.current = Date.now();
        pausedAtRef.current = null;
        
        // Remove pause state from localStorage
        try {
          localStorage.setItem(`sessionIsPaused_${itemId}`, 'false');
          localStorage.removeItem(`sessionPauseTime_${itemId}`);
        } catch (e) {
          console.error('Error removing pause state from localStorage:', e);
        }
      }
    }
  }, [isPaused, isActive, itemId]);
  
  // Handle visibility changes
  useEffect(() => {
    if (!isActive) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden - save current state
        try {
          localStorage.setItem(`sessionHiddenTimestamp_${itemId}`, Date.now().toString());
          localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, elapsedTime.toString());
          localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formattedTime);
          localStorage.setItem(`sessionIsPaused_${itemId}`, isPaused.toString());
          
          if (isPaused) {
            localStorage.setItem(`sessionElapsedBeforePause_${itemId}`, elapsedBeforePauseRef.current.toString());
          }
        } catch (e) {
          console.error('Error saving state on visibility change:', e);
        }
      } else if (document.visibilityState === 'visible') {
        // Page is visible again - check if we need to adjust time
        try {
          const hiddenTimestampStr = localStorage.getItem(`sessionHiddenTimestamp_${itemId}`);
          
          if (hiddenTimestampStr && !isPaused) {
            const hiddenTimestamp = parseInt(hiddenTimestampStr, 10);
            const timeAwayMs = Date.now() - hiddenTimestamp;
            
            // Only adjust if we've been away for more than 2 seconds
            if (timeAwayMs > 2000) {
              console.log(`Page was hidden for ${timeAwayMs}ms, adjusting timer`);
              
              // Adjust our timer to account for time away
              const timeAwaySec = Math.floor(timeAwayMs / 1000);
              elapsedBeforePauseRef.current += timeAwaySec;
              startTimeRef.current = Date.now();
              
              // Update UI with adjusted time
              setElapsedTime(elapsedBeforePauseRef.current);
              setFormattedTime(formatSeconds(elapsedBeforePauseRef.current));
            }
          }
          
          // Clear hidden timestamp
          localStorage.removeItem(`sessionHiddenTimestamp_${itemId}`);
        } catch (e) {
          console.error('Error processing visibility change:', e);
        }
      }
    };
    
    // Register visibility change event
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Mobile-specific event handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handleVisibilityChange);
      window.addEventListener('pageshow', () => {
        setTimeout(handleVisibilityChange, 0);
      });
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handleVisibilityChange);
        window.removeEventListener('pageshow', handleVisibilityChange);
      }
    };
  }, [isActive, isPaused, itemId, elapsedTime, formattedTime]);
  
  // Handle pause/resume button click
  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };
  
  // UI states for timer
  const getTimerState = () => {
    if (!isActive) return 'idle';
    if (isPaused) return 'paused';
    return 'active';
  };
  
  const timerState = getTimerState();
  
  return (
    <div className="flex flex-col items-center space-y-2">
      <motion.div 
        className="text-3xl font-bold"
        animate={{ 
          scale: [1, 1.03, 1],
          transition: { duration: 1, repeat: Infinity }
        }}
      >
        {formattedTime}
      </motion.div>
      
      <div className="flex space-x-2">
        {isActive && (
          <button
            onClick={handlePauseResume}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        )}
      </div>
      
      <div className="text-xs text-gray-500">
        {timerState === 'idle' && 'Ready to start'}
        {timerState === 'active' && 'Timer running'}
        {timerState === 'paused' && 'Timer paused'}
      </div>
    </div>
  );
};

// Export as both default and named export for flexibility
export { WorkerPomodoroTimer as default, WorkerPomodoroTimer };
