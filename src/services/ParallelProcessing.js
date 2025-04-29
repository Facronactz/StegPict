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

        // Determine merge order and target files
        const { mainFile, secondaryFile } = imageData.byteLength > archiveData.byteLength
            ? { mainFile: imageData, secondaryFile: archiveData }
            : { mainFile: archiveData, secondaryFile: imageData };

        const totalChunks = workerPoolSize;
        const chunkSize = Math.ceil(mainFile.byteLength / totalChunks);

        // Split MAIN file only
        const workUnits = Array.from({length: totalChunks}, (_, i) => {
            const start = i * chunkSize;
            const end = start + chunkSize;
            return {
                chunk: mainFile.slice(start, end),
                index: i
            };
        });

        // Process chunks in parallel (no merging in workers)
        const results = await Promise.all(
            workUnits.map((unit, idx) => {
                const worker = workerPool[idx % workerPoolSize];
                return new Promise((resolve, reject) => {
                    worker.onmessage = (e) => {
                        if (e.data.error) reject(e.data.error);
                        resolve(e.data.result);
                    };
                    // Send only the chunk to workers
                    worker.postMessage({ chunk: unit.chunk, index: unit.index });
                });
            })
        );

        // Reassemble MAIN file from chunks
        const mainReconstructed = new Uint8Array(mainFile.byteLength);
        let offset = 0;
        results.sort((a, b) => a.index - b.index).forEach(buffer => {
            mainReconstructed.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
        });

        // Merge with secondary file ONCE
        const finalMerged = mergeOrder === 'append'
            ? concatArrays(mainReconstructed, secondaryFile)
            : concatArrays(secondaryFile, mainReconstructed);

        return finalMerged.buffer;
    } catch (error) {
        throw new Error(`Parallel processing failed: ${error.message}`);
    }
};

// Helper to concatenate Uint8Arrays
const concatArrays = (a, b) => {
    const merged = new Uint8Array(a.byteLength + b.byteLength);
    merged.set(a, 0);
    merged.set(b, a.byteLength);
    return merged;
};

// Helper function to reverse merge order
const reverseMergeOrder = (mergeOrder) => {
    return mergeOrder === 'append' ? 'prepend' : 'append';
};