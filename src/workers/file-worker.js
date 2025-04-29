self.addEventListener('message', async (e) => {
    try {
        const { chunk, index } = e.data;
        // Do any per-chunk processing here if needed
        const buffer = new Uint8Array(chunk);
        self.postMessage({ result: buffer, index }, [buffer.buffer]);
    } catch (error) {
        self.postMessage({ error: error.message });
    }
});