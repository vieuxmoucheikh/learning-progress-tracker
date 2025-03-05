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
  const workerRef = useRef<Worker | null>(null);
  const initializedRef = useRef(false);

  // Initialize Web Worker
  useEffect(() => {
    // Only create the worker if we're in the browser environment
    if (typeof window !== 'undefined' && window.Worker) {
      // Create a new worker
      try {
        // Create worker from blob to avoid CORS issues
        const workerCode = `
          let intervalId = null;
          let startTime = null;
          let pausedAt = null;
          let elapsedTimeBeforePause = 0;
          let lastUpdateTime = Date.now();
          
          self.addEventListener('message', (event) => {
            const data = event.data;
            const now = Date.now();
            
            switch (data.command) {
              case 'start':
                if (startTime === null) {
                  startTime = data.startTime || now;
                  elapsedTimeBeforePause = data.elapsed || 0;
                  lastUpdateTime = now;
                  
                  if (intervalId !== null) {
                    clearInterval(intervalId);
                  }
                  
                  intervalId = setInterval(() => {
                    if (pausedAt) return;
                    
                    const currentTime = Date.now();
                    const elapsedSinceStart = Math.floor((currentTime - startTime) / 1000);
                    const totalElapsed = elapsedTimeBeforePause + elapsedSinceStart;
                    
                    self.postMessage({
                      type: 'tick',
                      elapsed: totalElapsed,
                      timestamp: currentTime
                    });
                    
                    if (currentTime - lastUpdateTime > 10000) {
                      self.postMessage({
                        type: 'sync',
                        elapsed: totalElapsed,
                        timestamp: currentTime
                      });
                      lastUpdateTime = currentTime;
                    }
                  }, 1000);
                  
                  self.postMessage({ 
                    type: 'started', 
                    startTime,
                    elapsed: elapsedTimeBeforePause 
                  });
                }
                break;
                
              case 'pause':
                pausedAt = now;
                
                if (startTime) {
                  const elapsedSinceStart = Math.floor((pausedAt - startTime) / 1000);
                  elapsedTimeBeforePause += elapsedSinceStart;
                  startTime = null;
                }
                
                self.postMessage({ 
                  type: 'paused', 
                  elapsed: elapsedTimeBeforePause,
                  timestamp: pausedAt 
                });
                break;
                
              case 'resume':
                if (pausedAt) {
                  startTime = now;
                  pausedAt = null;
                  
                  self.postMessage({ 
                    type: 'resumed', 
                    startTime,
                    elapsed: elapsedTimeBeforePause,
                    timestamp: now 
                  });
                }
                break;
                
              case 'stop':
                if (intervalId !== null) {
                  clearInterval(intervalId);
                  intervalId = null;
                }
                
                let finalElapsed = elapsedTimeBeforePause;
                if (startTime && !pausedAt) {
                  const elapsedSinceStart = Math.floor((now - startTime) / 1000);
                  finalElapsed += elapsedSinceStart;
                }
                
                startTime = null;
                pausedAt = null;
                elapsedTimeBeforePause = 0;
                
                self.postMessage({ 
                  type: 'stopped', 
                  elapsed: finalElapsed,
                  timestamp: now 
                });
                break;
                
              case 'sync':
                let currentElapsed = elapsedTimeBeforePause;
                if (startTime && !pausedAt) {
                  const elapsedSinceStart = Math.floor((now - startTime) / 1000);
                  currentElapsed += elapsedSinceStart;
                }
                
                self.postMessage({
                  type: 'sync',
                  elapsed: currentElapsed,
                  isPaused: !!pausedAt,
                  startTime,
                  pausedAt,
                  timestamp: now
                });
                break;
                
              case 'adjust':
                if (data.elapsed !== undefined) {
                  elapsedTimeBeforePause = data.elapsed;
                }
                
                if (data.startTime) {
                  startTime = data.startTime;
                }
                
                self.postMessage({
                  type: 'adjusted',
                  elapsed: elapsedTimeBeforePause,
                  startTime,
                  timestamp: now
                });
                break;
            }
          });
          
          self.postMessage({ type: 'ready', timestamp: Date.now() });
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        workerRef.current = new Worker(workerUrl);
        
        // Set up message handler from worker
        workerRef.current.onmessage = (event) => {
          const data = event.data;
          
          switch (data.type) {
            case 'ready':
              console.log('Timer worker is ready');
              initializedRef.current = true;
              
              // Initialize if we're active
              if (isActive && startTime) {
                startTimerWorker();
              }
              break;
              
            case 'tick':
              setElapsedTime(data.elapsed);
              setFormattedTime(formatSeconds(data.elapsed));
              
              // Update localStorage with current time for persistence
              try {
                localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, data.elapsed.toString());
                localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatSeconds(data.elapsed));
              } catch (e) {
                console.error('Error saving time to localStorage:', e);
              }
              break;
              
            case 'sync':
              // Handle periodic sync state from worker
              try {
                localStorage.setItem(`sessionCurrentTimeSeconds_${itemId}`, data.elapsed.toString());
                localStorage.setItem(`sessionCurrentTimeFormatted_${itemId}`, formatSeconds(data.elapsed));
                localStorage.setItem(`sessionLastSyncTime_${itemId}`, data.timestamp.toString());
              } catch (e) {
                console.error('Error syncing time to localStorage:', e);
              }
              break;
              
            case 'paused':
            case 'resumed':
            case 'started':
            case 'stopped':
            case 'adjusted':
              console.log(`Timer worker event: ${data.type}`, data);
              break;
          }
        };
        
        // Handle worker errors
        workerRef.current.onerror = (error) => {
          console.error('Timer worker error:', error);
        };
        
        console.log('Timer worker initialized');
      } catch (e) {
        console.error('Error creating timer worker:', e);
      }
    }
    
    // Clean up worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        console.log('Timer worker terminated');
      }
    };
  }, [itemId]);
  
  // Start the timer worker when session becomes active
  const startTimerWorker = () => {
    if (!workerRef.current || !initializedRef.current) return;
    
    const startTimeMs = startTime ? new Date(startTime).getTime() : Date.now();
    
    // Get any previously stored elapsed time
    let initialElapsed = 0;
    try {
      const storedElapsedStr = localStorage.getItem(`sessionCurrentTimeSeconds_${itemId}`);
      if (storedElapsedStr) {
        initialElapsed = parseInt(storedElapsedStr, 10);
      }
    } catch (e) {
      console.error('Error retrieving elapsed time from localStorage:', e);
    }
    
    // Start the worker
    workerRef.current.postMessage({
      command: 'start',
      startTime: startTimeMs,
      elapsed: initialElapsed
    });
    
    console.log(`Started timer worker with startTime: ${new Date(startTimeMs).toISOString()}, elapsed: ${initialElapsed}s`);
  };
  
  // Handle active state changes
  useEffect(() => {
    if (isActive && startTime) {
      if (workerRef.current && initializedRef.current) {
        startTimerWorker();
      }
    } else {
      // Stop the worker if session is no longer active
      if (workerRef.current) {
        workerRef.current.postMessage({ command: 'stop' });
        console.log('Stopped timer worker due to inactive session');
      }
    }
  }, [isActive, startTime]);
  
  // Handle pause/resume state
  useEffect(() => {
    if (!workerRef.current || !initializedRef.current || !isActive) return;
    
    if (isPaused) {
      workerRef.current.postMessage({ command: 'pause' });
      console.log('Paused timer worker');
    } else {
      workerRef.current.postMessage({ command: 'resume' });
      console.log('Resumed timer worker');
    }
  }, [isPaused, isActive]);
  
  // Handle visibility changes
  useEffect(() => {
    if (!workerRef.current || !initializedRef.current) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden - save current time
        console.log('Page hidden, saving current timer state');
        
        if (workerRef.current) {
          workerRef.current.postMessage({ command: 'sync' });
        }
        
        // Save visibility change time to localStorage
        try {
          localStorage.setItem(`sessionHiddenTimestamp_${itemId}`, Date.now().toString());
          
          // Save if the session was active when hidden
          if (isActive && !isPaused) {
            localStorage.setItem(`sessionWasActiveOnHide_${itemId}`, 'true');
            localStorage.setItem(`sessionLastElapsedTime_${itemId}`, elapsedTime.toString());
          }
        } catch (e) {
          console.error('Error saving visibility state to localStorage:', e);
        }
      } else if (document.visibilityState === 'visible') {
        // Page is visible again - check how long we were away
        console.log('Page visible again, checking timer state');
        
        try {
          const hiddenTimestampStr = localStorage.getItem(`sessionHiddenTimestamp_${itemId}`);
          const wasActiveOnHide = localStorage.getItem(`sessionWasActiveOnHide_${itemId}`) === 'true';
          const lastElapsedTimeStr = localStorage.getItem(`sessionLastElapsedTime_${itemId}`);
          
          if (hiddenTimestampStr && wasActiveOnHide && lastElapsedTimeStr && isActive && !isPaused) {
            const hiddenTimestamp = parseInt(hiddenTimestampStr, 10);
            const lastElapsedTime = parseInt(lastElapsedTimeStr, 10);
            const timeAwayMs = Date.now() - hiddenTimestamp;
            const timeAwaySec = Math.floor(timeAwayMs / 1000);
            
            console.log(`Page was hidden for ${timeAwaySec}s with active timer`);
            
            // Sync with worker to adjust for time away
            if (workerRef.current) {
              // Ask worker for current state
              workerRef.current.postMessage({ 
                command: 'sync'
              });
            }
          }
          
          // Clear hidden state
          localStorage.removeItem(`sessionHiddenTimestamp_${itemId}`);
          localStorage.removeItem(`sessionWasActiveOnHide_${itemId}`);
        } catch (e) {
          console.error('Error processing visibility change:', e);
        }
      }
    };
    
    // Register event handlers
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Mobile-specific handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handleVisibilityChange);
      window.addEventListener('pageshow', () => {
        setTimeout(handleVisibilityChange, 0);
      });
      
      if ('onfreeze' in document) {
        document.addEventListener('freeze', handleVisibilityChange);
        document.addEventListener('resume', () => {
          setTimeout(handleVisibilityChange, 0);
        });
      }
    }
    
    // Handle initial visibility check
    handleVisibilityChange();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handleVisibilityChange);
        window.removeEventListener('pageshow', handleVisibilityChange);
        
        if ('onfreeze' in document) {
          document.removeEventListener('freeze', handleVisibilityChange);
          document.removeEventListener('resume', handleVisibilityChange);
        }
      }
    };
  }, [isActive, isPaused, itemId, elapsedTime]);
  
  // Handle pause/resume button click
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

export default WorkerPomodoroTimer;
