let interval = null;
let isRunning = false;
let lastTickTime = null;
let remainingTime = 0;

self.onmessage = (e) => {
    const { command, time } = e.data;
    
    if (command === 'start') {
        // Clear any existing interval
        if (interval) {
            clearInterval(interval);
        }
        
        isRunning = true;
        lastTickTime = Date.now();
        
        // If time is provided, set the remaining time
        if (time !== undefined) {
            remainingTime = time;
            console.log(`Timer worker: Setting remaining time to ${time} seconds`);
        }
        
        // Start a new interval
        interval = setInterval(() => {
            if (isRunning) {
                // Calculate how many seconds have passed since the last tick
                const now = Date.now();
                const elapsedSeconds = Math.floor((now - lastTickTime) / 1000);
                lastTickTime = now;
                
                if (elapsedSeconds > 0) {
                    // Update the remaining time
                    remainingTime = Math.max(0, remainingTime - elapsedSeconds);
                    
                    // Send a tick message with the updated remaining time
                    self.postMessage({ 
                        type: 'tick', 
                        remainingTime: remainingTime 
                    });
                }
            }
        }, 1000);
    } else if (command === 'stop') {
        isRunning = false;
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    } else if (command === 'pause') {
        isRunning = false;
    } else if (command === 'resume') {
        isRunning = true;
        lastTickTime = Date.now();
    }
};
