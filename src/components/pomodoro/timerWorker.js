let interval = null;
let lastTick = Date.now();

self.onmessage = (e) => {
    const { command, time } = e.data;
    
    if (command === 'start') {
        // Clear any existing interval
        if (interval) {
            clearInterval(interval);
        }
        
        // Record the start time
        lastTick = Date.now();
        
        // Start a new interval
        interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - lastTick;
            
            // If more than 1.5 seconds have passed, it might be due to tab switching
            // Calculate how many ticks we missed
            if (elapsed > 1500) {
                const missedTicks = Math.floor(elapsed / 1000);
                for (let i = 0; i < missedTicks; i++) {
                    self.postMessage({ type: 'tick' });
                }
            } else {
                // Normal tick
                self.postMessage({ type: 'tick' });
            }
            
            // Update last tick time
            lastTick = now;
        }, 1000);
    } else if (command === 'stop') {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    } else if (command === 'sync') {
        // Sync the worker's time with the main thread
        lastTick = Date.now();
    }
};
