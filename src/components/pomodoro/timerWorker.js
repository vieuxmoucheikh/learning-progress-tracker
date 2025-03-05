self.onmessage = (e) => {
    const { command } = e.data;
    if (command === 'start') {
        const interval = setInterval(() => {
            self.postMessage({ type: 'tick' });
        }, 1000);
        self.onmessage = (e) => {
            if (e.data.command === 'stop') {
                clearInterval(interval);
            }
        };
    }
};
