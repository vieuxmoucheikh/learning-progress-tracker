import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSessionTimerProps {
  isActive: boolean;
  startTime: string | null;
  externalPaused?: boolean;
  itemId: string;
}

// Helper function to format seconds as HH:MM:SS
const formatSeconds = (seconds: number): string => {
  // Ensure seconds is a positive number
  seconds = Math.max(0, seconds);
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

// Helper to safely parse a number from localStorage
const safeParseInt = (value: string | null, defaultValue: number = 0): number => {
  if (!value) return defaultValue;
  try {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  } catch (e) {
    return defaultValue;
  }
};

export const useSessionTimer = ({ isActive, startTime, externalPaused = false, itemId }: UseSessionTimerProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [formattedTime, setFormattedTime] = useState('00:00:00');
  const [internalPaused, setInternalPaused] = useState(externalPaused);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  
  // References to preserve values across renders
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const wasResumedRef = useRef<boolean>(false);
  const lastVisibleTimeRef = useRef<number>(Date.now());
  const lastElapsedTimeRef = useRef<number>(0);
  
  // Set up key prefixes for localStorage
  const SESSION_KEYS = {
    START_TIME: `sessionStartTimeBase_${itemId}`,
    IS_PAUSED: `sessionIsPaused_${itemId}`,
    PAUSE_TIME: `sessionPauseTime_${itemId}`,
    CURRENT_SECONDS: `sessionCurrentTimeSeconds_${itemId}`,
    FORMATTED_TIME: `sessionCurrentTimeFormatted_${itemId}`,
    FROZEN_TIME: `sessionFrozenTime_${itemId}`,
    HIDDEN_TIMESTAMP: `sessionHiddenTimestamp_${itemId}`,
    WAS_ACTIVE: `sessionWasActiveOnHide_${itemId}`,
    LAST_ELAPSED: `sessionLastElapsedTime_${itemId}`,
    ACCUMULATED: `sessionAccumulatedTime_${itemId}`,
    LAST_SYNC: `sessionLastSyncTime_${itemId}`
  };
  
  // Clear any existing interval
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('Timer interval cleared');
    }
  }, []);
  
  // Helper to calculate the current elapsed time in seconds
  const calculateElapsedTime = useCallback((): number => {
    if (!startTime) return 0;
    
    const now = Date.now();
    const start = new Date(startTime).getTime();
    const rawDuration = Math.floor((now - start) / 1000);
    
    // Try to get accumulated time from localStorage first (for persistence)
    const storedAccumulatedTime = localStorage.getItem(SESSION_KEYS.ACCUMULATED);
    const accumulatedTime = storedAccumulatedTime 
      ? safeParseInt(storedAccumulatedTime) 
      : accumulatedTimeRef.current || 0;
    
    // Calculate adjusted time based on accumulated paused time
    const adjustedTime = rawDuration - accumulatedTime;
    
    // Safeguard against negative values (can happen due to clock skew)
    if (adjustedTime < 0) {
      console.warn('Calculated negative time:', adjustedTime, 
        'raw:', rawDuration, 
        'accumulated:', accumulatedTime,
        'start:', new Date(start).toISOString(),
        'now:', new Date(now).toISOString());
      return 0; // Return 0 instead of negative values
    }
    
    return adjustedTime;
  }, [startTime, SESSION_KEYS.ACCUMULATED]);
  
  // Helper to update formatted time (ensuring it's always valid)
  const updateFormattedTime = useCallback((seconds: number) => {
    // Prevent negative values
    if (seconds < 0) {
      console.warn('Preventing negative timer value:', seconds);
      seconds = 0;
    }
    
    const formatted = formatSeconds(seconds);
    setFormattedTime(formatted);
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem(SESSION_KEYS.CURRENT_SECONDS, seconds.toString());
      localStorage.setItem(SESSION_KEYS.FORMATTED_TIME, formatted);
      localStorage.setItem(SESSION_KEYS.LAST_SYNC, Date.now().toString());
      lastElapsedTimeRef.current = seconds;
    } catch (e) {
      console.error('Error updating localStorage with formatted time:', e);
    }
  }, [SESSION_KEYS.CURRENT_SECONDS, SESSION_KEYS.FORMATTED_TIME, SESSION_KEYS.LAST_SYNC]);
  
  // Sync accumulated time to localStorage
  const syncAccumulatedTime = useCallback(() => {
    try {
      localStorage.setItem(SESSION_KEYS.ACCUMULATED, accumulatedTimeRef.current.toString());
    } catch (e) {
      console.error('Error syncing accumulated time to localStorage:', e);
    }
  }, [SESSION_KEYS.ACCUMULATED]);
  
  // CRITICAL: This effect handles the timer interval based on pause state
  useEffect(() => {
    // If not active or no start time, don't do anything
    if (!isActive || !startTime) {
      clearTimerInterval();
      return;
    }
    
    // IMPORTANT: Check if we should be paused
    if (internalPaused) {
      console.log('Timer is paused - ensuring interval is cleared');
      
      // Stop any running interval
      clearTimerInterval();
      
      // Get the frozen time to display
      const frozenTimeStr = localStorage.getItem(SESSION_KEYS.FROZEN_TIME);
      if (frozenTimeStr) {
        const frozenTime = safeParseInt(frozenTimeStr);
        setElapsedTime(frozenTime);
        updateFormattedTime(frozenTime);
      }
      return;
    }
    
    // Timer should be running - start or maintain the interval
    console.log('Timer should be running, starting/maintaining interval');
    
    // Always calculate time once immediately
    const elapsed = calculateElapsedTime();
    setElapsedTime(elapsed);
    updateFormattedTime(elapsed);
    
    // Make sure we only have one interval running
    clearTimerInterval();
    
    // Start a new interval
    intervalRef.current = setInterval(() => {
      const elapsed = calculateElapsedTime();
      setElapsedTime(elapsed);
      updateFormattedTime(elapsed);
      
      // Periodically sync state to localStorage (every ~10 seconds)
      // This helps ensure we don't lose state if the page crashes
      if (Date.now() - lastUpdateTime > 10000) {
        syncAccumulatedTime();
        setLastUpdateTime(Date.now());
      }
    }, 1000);
    
    // Cleanup interval on unmount or when dependencies change
    return () => {
      clearTimerInterval();
    };
  }, [
    isActive, 
    startTime, 
    internalPaused, 
    calculateElapsedTime, 
    updateFormattedTime,
    clearTimerInterval,
    lastUpdateTime,
    syncAccumulatedTime,
    SESSION_KEYS.FROZEN_TIME
  ]);
  
  // Effect to sync internal pause state with external pause state
  useEffect(() => {
    if (externalPaused !== internalPaused) {
      setInternalPaused(externalPaused);
      
      // If we're newly paused, record current time as pause time
      if (externalPaused) {
        const pauseTime = Date.now();
        localStorage.setItem(SESSION_KEYS.PAUSE_TIME, pauseTime.toString());
        localStorage.setItem(SESSION_KEYS.IS_PAUSED, 'true');
        
        // Store current elapsed time as frozen time
        const currentElapsed = calculateElapsedTime();
        localStorage.setItem(SESSION_KEYS.FROZEN_TIME, currentElapsed.toString());
      } else {
        // We're resuming - handle accumulated pause time
        handleResume();
      }
    }
  }, [externalPaused, internalPaused, calculateElapsedTime, SESSION_KEYS.PAUSE_TIME, SESSION_KEYS.IS_PAUSED, SESSION_KEYS.FROZEN_TIME]);
  
  // Handle page visibility, mobile app backgrounding, and screen locking
  useEffect(() => {
    // Combined visibility change handler
    const handleAppStateChange = () => {
      const isHidden = document.visibilityState === 'hidden';
      const now = Date.now();
      
      if (isHidden) {
        // App is hidden/backgrounded/screen locked
        if (isActive && !internalPaused) {
          console.log('App hidden while timer active - saving current state');
          
          lastVisibleTimeRef.current = now;
          
          // Store current time and state
          const currentElapsed = calculateElapsedTime();
          lastElapsedTimeRef.current = currentElapsed;
          
          try {
            localStorage.setItem(SESSION_KEYS.LAST_ELAPSED, currentElapsed.toString());
            localStorage.setItem(SESSION_KEYS.HIDDEN_TIMESTAMP, now.toString());
            localStorage.setItem(SESSION_KEYS.WAS_ACTIVE, 'true');
            
            // Also save the accumulated time so it persists
            localStorage.setItem(SESSION_KEYS.ACCUMULATED, accumulatedTimeRef.current.toString());
          } catch (e) {
            console.error('Error saving session state to localStorage:', e);
          }
        }
      } else {
        // App is visible again
        console.log('App visible again - checking session state');
        
        // Calculate time away
        const timeAwayMs = now - lastVisibleTimeRef.current;
        console.log(`App was away for ${Math.round(timeAwayMs / 1000)} seconds`);
        
        // If the timer was active when we left, adjust for the time away
        const wasActive = localStorage.getItem(SESSION_KEYS.WAS_ACTIVE) === 'true';
        const hiddenTimestampStr = localStorage.getItem(SESSION_KEYS.HIDDEN_TIMESTAMP);
        const lastElapsedTimeStr = localStorage.getItem(SESSION_KEYS.LAST_ELAPSED);
        
        if (wasActive && hiddenTimestampStr && lastElapsedTimeStr && isActive && !internalPaused) {
          try {
            const hiddenTimestamp = safeParseInt(hiddenTimestampStr);
            const timeAway = Math.floor((now - hiddenTimestamp) / 1000); // in seconds
            const lastElapsedTime = safeParseInt(lastElapsedTimeStr);
            
            console.log(`Session was active when hidden. Time away: ${timeAway}s, Last elapsed: ${lastElapsedTime}s`);
            
            // Only update if significant time has passed
            if (timeAway > 1) {
              const newElapsedTime = lastElapsedTime + timeAway;
              console.log(`Updating timer to ${newElapsedTime}s`);
              
              setElapsedTime(newElapsedTime);
              updateFormattedTime(newElapsedTime);
              
              // Force an immediate interval tick to update display
              clearTimerInterval();
              intervalRef.current = setInterval(() => {
                const elapsed = calculateElapsedTime();
                setElapsedTime(elapsed);
                updateFormattedTime(elapsed);
              }, 1000);
            }
          } catch (e) {
            console.error('Error parsing session state:', e);
          }
          
          // Clear hidden state
          localStorage.removeItem(SESSION_KEYS.WAS_ACTIVE);
          localStorage.removeItem(SESSION_KEYS.HIDDEN_TIMESTAMP);
          localStorage.removeItem(SESSION_KEYS.LAST_ELAPSED);
        }
        
        // Also check pause state
        const isPausedStr = localStorage.getItem(SESSION_KEYS.IS_PAUSED);
        const pauseTimeStr = localStorage.getItem(SESSION_KEYS.PAUSE_TIME);
        const shouldBePaused = isPausedStr === 'true' || !!pauseTimeStr;
        
        if (shouldBePaused && !internalPaused) {
          console.log('Found pause markers on visibility change, forcing pause');
          setInternalPaused(true);
        } else if (!shouldBePaused && internalPaused) {
          console.log('No pause markers but paused internally, resuming');
          setInternalPaused(false);
          handleResume();
        }
        
        // Ensure the lastVisibleTime is updated
        lastVisibleTimeRef.current = now;
      }
    };
    
    // Register handlers for various events that can pause JavaScript execution
    document.addEventListener('visibilitychange', handleAppStateChange);
    
    // Mobile-specific events
    if (typeof window !== 'undefined') {
      // For Cordova/PhoneGap apps
      document.addEventListener('pause', () => {
        console.log('Mobile app paused event triggered');
        handleAppStateChange();
      });
      
      document.addEventListener('resume', () => {
        console.log('Mobile app resume event triggered');
        handleAppStateChange();
      });
      
      // For older Android WebView
      window.addEventListener('freeze', () => {
        console.log('Window freeze event triggered');
        handleAppStateChange();
      });
      
      window.addEventListener('resume', () => {
        console.log('Window resume event triggered');
        handleAppStateChange();
      });
    }
    
    // Call once on mount
    handleAppStateChange();
    
    return () => {
      document.removeEventListener('visibilitychange', handleAppStateChange);
      
      // Clean up mobile-specific events
      if (typeof window !== 'undefined') {
        document.removeEventListener('pause', handleAppStateChange);
        document.removeEventListener('resume', handleAppStateChange);
        window.removeEventListener('freeze', handleAppStateChange);
        window.removeEventListener('resume', handleAppStateChange);
      }
    };
  }, [
    internalPaused, 
    itemId, 
    isActive, 
    calculateElapsedTime, 
    updateFormattedTime,
    clearTimerInterval,
    SESSION_KEYS.LAST_ELAPSED,
    SESSION_KEYS.HIDDEN_TIMESTAMP,
    SESSION_KEYS.WAS_ACTIVE,
    SESSION_KEYS.ACCUMULATED,
    SESSION_KEYS.IS_PAUSED,
    SESSION_KEYS.PAUSE_TIME,
  ]);
  
  // Handle resuming a session
  const handleResume = useCallback(() => {
    if (!startTime || !internalPaused) return;
    
    // Get pause time
    const pauseTimeStr = localStorage.getItem(SESSION_KEYS.PAUSE_TIME);
    if (pauseTimeStr) {
      try {
        const pauseTime = parseInt(pauseTimeStr, 10);
        const now = Date.now();
        
        // Calculate duration of pause in seconds
        const pauseDuration = Math.floor((now - pauseTime) / 1000);
        
        console.log(`Resuming after ${pauseDuration}s pause`);
        
        // Update accumulated pause time
        accumulatedTimeRef.current += pauseDuration;
        
        // Sync to localStorage
        syncAccumulatedTime();
        
        // Clear pause indicators
        localStorage.removeItem(SESSION_KEYS.PAUSE_TIME);
        localStorage.removeItem(SESSION_KEYS.IS_PAUSED);
        localStorage.removeItem(SESSION_KEYS.FROZEN_TIME);
        
        wasResumedRef.current = true;
      } catch (e) {
        console.error('Error parsing pause time:', e);
      }
    }
  }, [startTime, internalPaused, syncAccumulatedTime, SESSION_KEYS.PAUSE_TIME, SESSION_KEYS.IS_PAUSED, SESSION_KEYS.FROZEN_TIME]);
  
  // Reset the timer completely
  const resetTimer = useCallback(() => {
    clearTimerInterval();
    setElapsedTime(0);
    updateFormattedTime(0);
    accumulatedTimeRef.current = 0;
    wasResumedRef.current = false;
    
    // Clear all localStorage items for this timer
    Object.values(SESSION_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }, [clearTimerInterval, updateFormattedTime, SESSION_KEYS]);
  
  return {
    elapsedTime,
    formattedTime,
    isPaused: internalPaused,
    resetTimer
  };
};
