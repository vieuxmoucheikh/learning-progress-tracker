// timer-worker.ts - A dedicated web worker to keep time running when tab is inactive
// This file is needed to ensure timers continue running on mobile devices

let intervalId: number | null = null;
let startTime: number | null = null;
let pausedAt: number | null = null;
let elapsedTimeBeforePause: number = 0;
let lastUpdateTime: number = Date.now();

// Setup messages from main thread
self.addEventListener('message', (event) => {
  const data = event.data;
  const now = Date.now();
  
  switch (data.command) {
    case 'start':
      // Start the timer
      if (startTime === null) {
        startTime = data.startTime || now;
        elapsedTimeBeforePause = data.elapsed || 0;
        lastUpdateTime = now;
        
        // Clear any existing interval
        if (intervalId !== null) {
          clearInterval(intervalId);
        }
        
        // Start a new interval that reports elapsed time
        intervalId = setInterval(() => {
          if (pausedAt) {
            // If paused, don't update
            return;
          }
          
          const currentTime = Date.now();
          const elapsedSinceStart = Math.floor((currentTime - startTime!) / 1000);
          const totalElapsed = elapsedTimeBeforePause + elapsedSinceStart;
          
          // Send current elapsed time to main thread
          self.postMessage({
            type: 'tick',
            elapsed: totalElapsed,
            timestamp: currentTime
          });
          
          // Save state periodically for recovery
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
      // Pause the timer
      pausedAt = now;
      
      // Calculate elapsed time at pause
      if (startTime) {
        const elapsedSinceStart = Math.floor((pausedAt - startTime) / 1000);
        elapsedTimeBeforePause += elapsedSinceStart;
        
        // Reset start time since we've accumulated into elapsedTimeBeforePause
        startTime = null;
      }
      
      self.postMessage({ 
        type: 'paused', 
        elapsed: elapsedTimeBeforePause,
        timestamp: pausedAt 
      });
      break;
      
    case 'resume':
      // Resume from pause
      if (pausedAt) {
        // Calculate additional time to add to accumulated time
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
      // Stop the timer completely
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      
      // Calculate final elapsed time
      let finalElapsed = elapsedTimeBeforePause;
      if (startTime && !pausedAt) {
        const elapsedSinceStart = Math.floor((now - startTime) / 1000);
        finalElapsed += elapsedSinceStart;
      }
      
      // Reset all variables
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
      // Request for current state
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
      // Adjust the elapsed time (e.g., after page visibility changes)
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

// Immediately send a ready message when the worker starts
self.postMessage({ type: 'ready', timestamp: Date.now() });
