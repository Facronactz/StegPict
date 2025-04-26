// Web Worker Management
export const initializeWorkers = ({workerPool, workerPoolSize}) => {
    // Cleanup existing workers
    workerPool.value.forEach(worker => worker.terminate());

    // Create new pool
    workerPool.value = Array.from({length: workerPoolSize}, () => {
        const worker = new Worker(new URL('../workers/file-worker.js', import.meta.url))
        worker.onerror = (e) => {
            console.error('Worker error:', e);
        };
        return worker
    });

};

// Modified processInParallel function
export const processInParallel = async ({imageData, archiveData, status, workerPool, workerPoolSize, mergeOrder}) => {
    try {
        status.value = 'merging';

        // Determine which file is larger
        const largerFile = imageData.byteLength > archiveData.byteLength
            ? {data: imageData, name: 'image'}
            : {data: archiveData, name: 'archive'};

        const smallerFile = largerFile.name === 'image'
            ? archiveData
            : imageData;

        const totalChunks = workerPoolSize;
        const chunkSize = Math.ceil(largerFile.data.byteLength / totalChunks);

        // Prepare work units
        const workUnits = Array.from({length: totalChunks}, (_, i) => {
            const start = i * chunkSize;
            const end = start + chunkSize;
            return {
                chunk: largerFile.data.slice(start, end),
                fullFile: smallerFile,
                mergeOrder: largerFile.name === 'image' ? mergeOrder : reverseMergeOrder(mergeOrder),
                index: i
            };
        });

        // Distribute work to workers
        const results = await Promise.all(
            workUnits.map((unit, idx) => {
                const worker = workerPool[idx % workerPoolSize];
                return new Promise((resolve, reject) => {
                    worker.onmessage = (e) => {
                        if (e.data.error) reject(e.data.error);
                        resolve(e.data.result);
                    };
                    worker.postMessage(unit, [unit.chunk]);
                });
            })
        );

        // Reassemble final file
        const merged = new Uint8Array(
            results.reduce((acc, cur) => acc + cur.byteLength, 0)
        );

        let offset = 0;
        for (const buffer of results.sort((a, b) => a.index - b.index)) {
            merged.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
        }

        // return merged.buffer;
        return Buffer.from(merged);
    } catch (error) {
        throw new Error(`Parallel processing failed: ${error.message}`);
    }
};

// Helper function to reverse merge order
const reverseMergeOrder = (mergeOrder) => {
    return mergeOrder === 'append' ? 'prepend' : 'append';
};