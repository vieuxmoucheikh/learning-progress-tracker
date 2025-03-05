import React, { useEffect, useState } from 'react';
import { useSessionTimer } from '../../hooks/useSessionTimer';
import { motion } from 'framer-motion';

interface PomodoroTimerProps {
  isActive: boolean;
  startTime: string | null;
  itemId: string;
  onComplete?: () => void;
}

export const SimplePomodoroTimer: React.FC<PomodoroTimerProps> = ({
  isActive,
  startTime,
  itemId,
  onComplete
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [initialRender, setInitialRender] = useState(true);
  
  // Use our enhanced timer hook that persists across visibility changes
  const { elapsedTime, formattedTime, isPaused: timerIsPaused, resetTimer } = useSessionTimer({
    isActive,
    startTime,
    externalPaused: isPaused,
    itemId
  });
  
  // Set up event listeners for mobile-specific events
  useEffect(() => {
    // Check if we should restore pause state from localStorage
    const loadInitialPauseState = () => {
      try {
        // We give priority to the "isPaused" flag from localStorage
        const storedIsPaused = localStorage.getItem(`sessionIsPaused_${itemId}`);
        if (storedIsPaused === 'true') {
          console.log('Restoring paused state from localStorage');
          setIsPaused(true);
        } else if (storedIsPaused === 'false') {
          console.log('Restoring unpaused state from localStorage');
          setIsPaused(false);
        }
      } catch (e) {
        console.error('Error loading initial pause state:', e);
      }
    };
    
    if (initialRender && isActive) {
      loadInitialPauseState();
      setInitialRender(false);
    }
    
    // Mobile-specific event handlers to help with timer state
    const handleAppStateChange = () => {
      console.log('App state changed on mobile');
      // Mobile app state changes will be handled by the useSessionTimer hook
    };
    
    // For mobile browsers, we need to listen to additional events
    if (typeof window !== 'undefined') {
      // PWA/mobile browser life cycle events
      window.addEventListener('pagehide', handleAppStateChange);
      window.addEventListener('pageshow', handleAppStateChange);
      
      // Mobile-specific events (supported in some browsers)
      if ('onfreeze' in document) {
        document.addEventListener('freeze', handleAppStateChange);
        document.addEventListener('resume', handleAppStateChange);
      }
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handleAppStateChange);
        window.removeEventListener('pageshow', handleAppStateChange);
        
        if ('onfreeze' in document) {
          document.removeEventListener('freeze', handleAppStateChange);
          document.removeEventListener('resume', handleAppStateChange);
        }
      }
    };
  }, [isActive, itemId, initialRender]);
  
  // Handle pause/resume
  const handlePauseResume = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    try {
      // Store pause state in localStorage for persistence
      localStorage.setItem(`sessionIsPaused_${itemId}`, newPausedState.toString());
      
      if (newPausedState) {
        // Store pause time
        const pauseTime = Date.now();
        localStorage.setItem(`sessionPauseTime_${itemId}`, pauseTime.toString());
      } else {
        // Clear pause time when resuming
        localStorage.removeItem(`sessionPauseTime_${itemId}`);
      }
    } catch (e) {
      console.error('Error updating pause state in localStorage:', e);
    }
  };
  
  // UI States for the timer
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

export default SimplePomodoroTimer;
