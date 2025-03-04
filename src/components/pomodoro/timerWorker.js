self.onmessage = (e) => {
    const { command, time } = e.data;
    let interval;
    let startTime;
    let remainingTime;
    let isPaused = false;

    if (command === 'start') {
        clearInterval(interval);
        startTime = Date.now();
        remainingTime = time || 0;
        
        interval = setInterval(() => {
            if (!isPaused) {
                self.postMessage({ type: 'tick' });
            }
        }, 1000);
        
        self.onmessage = (e) => {
            if (e.data.command === 'stop') {
                clearInterval(interval);
            } else if (e.data.command === 'pause') {
                isPaused = true;
            } else if (e.data.command === 'resume') {
                isPaused = false;
                startTime = Date.now();
            } else if (e.data.command === 'sync') {
                // Sync the timer with the current time
                const elapsed = Math.floor((Date.now() - e.data.timestamp) / 1000);
                self.postMessage({ 
                    type: 'sync', 
                    elapsed: elapsed 
                });
            }
        };
    }
};
