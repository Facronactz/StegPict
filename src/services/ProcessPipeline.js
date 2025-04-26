import {mergeFilesChunked, readFileChunked} from "./ChunkedProcessing.js";
import {mergeFiles, readFile} from "./FileOperation.js";

export const readFilePipeline = async ({isChunked = false, image, archive, chunkSize, progress}) => {
    try {
        if (isChunked) {
            const [imageData, archiveData] = await Promise.all([
                readFileChunked({
                    file: image,
                    chunkSize: chunkSize,
                    targetProgress: 25,
                    progress,
                }),
                readFileChunked({
                    file: archive,
                    chunkSize: chunkSize,
                    targetProgress: 50,
                    progress,
                })
            ])
            return [imageData, archiveData]
        } else {
            const [imageData, archiveData] = await Promise.all([
                readFile({
                    file: image,
                    targetProgress: 25,
                    progress,
                }),
                readFile({
                    file: archive,
                    targetProgress: 50,
                    progress,
                })
            ])
            return [imageData, archiveData]
        }
    } catch (err) {
        throw new Error('Failed to read files: ' + err.message)
    }
}

export const mergeFilePipeline = async ({isChunked = false, imageData, archiveData, mergeOrder}) => {
    if (isChunked) {
        return await mergeFilesChunked({
            imageData,
            archiveData,
            mergeOrder
        })
    } else {
        return await mergeFiles({
            imageData,
            archiveData,
            mergeOrder
        })
    }
}