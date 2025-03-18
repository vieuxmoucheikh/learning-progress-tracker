self.onmessage = (e) => {
    const { command, time } = e.data;
    let interval;
    
    if (command === 'start') {
        interval = setInterval(() => {
            self.postMessage({ type: 'tick' });
        }, 1000);
        
        self.onmessage = (e) => {
            if (e.data.command === 'stop') {
                clearInterval(interval);
            }
        };
    }
};
