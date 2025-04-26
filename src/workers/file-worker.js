importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');

self.addEventListener('message', async (e) => {
    try {
        const { chunk, fullFile, mergeOrder, index } = e.data;
        let processedChunk;

        if (mergeOrder === 'append') {
            processedChunk = await appendFile(chunk, fullFile);
        } else {
            processedChunk = await prependFile(chunk, fullFile);
        }

        self.postMessage({ result: processedChunk, index }, [processedChunk]);
    } catch (error) {
        self.postMessage({ error: error.message });
    }
});

async function appendFile(chunk, fullFile) {
    const merged = new Uint8Array(chunk.byteLength + fullFile.byteLength);
    merged.set(new Uint8Array(chunk), 0);
    merged.set(new Uint8Array(fullFile), chunk.byteLength);
    // return merged.buffer;
    return Buffer.from(merged);
}

async function prependFile(chunk, fullFile) {
    const merged = new Uint8Array(fullFile.byteLength + chunk.byteLength);
    merged.set(new Uint8Array(fullFile), 0);
    merged.set(new Uint8Array(chunk), fullFile.byteLength);
    // return merged.buffer;
    return Buffer.from(merged);
}