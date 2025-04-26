import {readFileChunked} from "./ChunkedProcessing.js";

export const readFile = ({file, targetProgress, progress}) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                progress.value = targetProgress * (e.loaded / e.total)
            }
        }

        reader.onload = () => resolve({
            data: reader.result,
            type: file.type,
            name: file.name
        })

        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
        reader.readAsArrayBuffer(file)
    })
}

export const mergeFiles = async ({imageData, archiveData}) => {
    try {
        const mergedArray = new Uint8Array(
            imageData.data.byteLength + archiveData.data.byteLength
        )
        mergedArray.set(new Uint8Array(imageData.data), 0)
        mergedArray.set(new Uint8Array(archiveData.data), imageData.data.byteLength)
        return new Blob([mergedArray], {type: imageData.type})
    } catch (err) {
        throw new Error('Failed to merge files: ' + err.message)
    }
}