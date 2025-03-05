// Timer worker for reliable background timekeeping
let interval = null;
let startTime = null;
let pausedTime = null;
let elapsedTime = 0;
let isRunning = false;
let lastTickTime = null;

// Function to calculate current elapsed time
function getElapsedSeconds() {
  if (!startTime) return 0;
  
  const now = Date.now();
  const elapsed = Math.floor((now - startTime) / 1000) + elapsedTime;
  return elapsed;
}

// Send a tick message to the main thread
function sendTick() {
  const now = Date.now();
  const currentElapsed = getElapsedSeconds();
  
  // Store the time of this tick
  lastTickTime = now;
  
  self.postMessage({ 
    type: 'tick', 
    elapsed: currentElapsed,
    timestamp: now
  });
}

// Start the timer
function startTimer() {
  if (isRunning) return;
  
  if (!startTime) {
    startTime = Date.now();
  }
  
  isRunning = true;
  
  // Clear any existing interval
  if (interval) {
    clearInterval(interval);
  }
  
  // Start a new interval
  interval = setInterval(() => {
    sendTick();
  }, 1000);
  
  // Send an immediate tick
  sendTick();
}

// Pause the timer
function pauseTimer() {
  if (!isRunning) return;
  
  // Clear the interval
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  
  // Calculate elapsed time up to this point
  if (startTime) {
    const now = Date.now();
    elapsedTime += Math.floor((now - startTime) / 1000);
    pausedTime = now;
    startTime = null;
  }
  
  isRunning = false;
  
  // Send a pause notification
  self.postMessage({ 
    type: 'paused', 
    elapsed: elapsedTime,
    timestamp: Date.now()
  });
}

// Resume the timer
function resumeTimer() {
  if (isRunning) return;
  
  startTime = Date.now();
  pausedTime = null;
  isRunning = true;
  
  // Start a new interval
  interval = setInterval(() => {
    sendTick();
  }, 1000);
  
  // Send an immediate tick
  sendTick();
  
  // Send a resume notification
  self.postMessage({ 
    type: 'resumed', 
    elapsed: elapsedTime,
    timestamp: startTime
  });
}

// Reset the timer
function resetTimer(newTime = 0) {
  // Clear any existing interval
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  
  startTime = null;
  pausedTime = null;
  elapsedTime = newTime;
  isRunning = false;
  
  // Send a reset notification
  self.postMessage({ 
    type: 'reset', 
    elapsed: elapsedTime,
    timestamp: Date.now()
  });
}

// Sync the timer with the main thread
function syncTimer(mainThreadTime) {
  if (!isRunning) {
    elapsedTime = mainThreadTime;
    return;
  }
  
  // Calculate the difference and adjust if needed
  const currentElapsed = getElapsedSeconds();
  const timeDiff = Math.abs(currentElapsed - mainThreadTime);
  
  // If the difference is significant (more than 2 seconds), sync
  if (timeDiff > 2) {
    console.log(`Timer worker: Syncing time. Worker: ${currentElapsed}s, Main: ${mainThreadTime}s`);
    
    // Adjust the start time to match the main thread's time
    const now = Date.now();
    startTime = now - (mainThreadTime - elapsedTime) * 1000;
    
    // Send an immediate tick with the synced time
    sendTick();
  }
}

// Handle messages from the main thread
self.onmessage = (e) => {
  const { command, time } = e.data;
  
  switch (command) {
    case 'start':
      resetTimer(time || 0);
      startTimer();
      break;
      
    case 'pause':
      pauseTimer();
      break;
      
    case 'resume':
      resumeTimer();
      break;
      
    case 'stop':
      pauseTimer();
      break;
      
    case 'reset':
      resetTimer(time || 0);
      break;
      
    case 'sync':
      if (time !== undefined) {
        syncTimer(time);
      }
      break;
      
    case 'status':
      // Send current status back to main thread
      self.postMessage({
        type: 'status',
        isRunning,
        elapsed: getElapsedSeconds(),
        timestamp: Date.now()
      });
      break;
  }
};
