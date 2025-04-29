export const readFileChunked = async ({file, chunkSize, progress, targetProgress}) => {
    return new Promise((resolve, reject) => {
        const chunks = []
        const totalChunks = Math.ceil(file.size / chunkSize)
        let chunksProcessed = 0

        const readChunk = (offset) => {
            const reader = new FileReader()
            const chunk = file.slice(offset, offset + chunkSize)

            reader.onload = (e) => {
                chunks.push(Buffer.from(e.target.result))
                chunksProcessed++
                progress.value = (chunksProcessed / totalChunks) * targetProgress

                if (offset + chunkSize < file.size) {
                    readChunk(offset + chunkSize)
                } else {
                    resolve({data: Buffer.concat(chunks), type: file.type, name: file.name})
                }
            }

            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
            reader.readAsArrayBuffer(chunk)
        }

        readChunk(0)
    })
}

export const mergeFilesChunked = async ({imageData, archiveData, mergeOrder}) => {
    return new Blob(
        mergeOrder === 'append'
            ? [Buffer.from(imageData.data), Buffer.from(archiveData.data)]
            : [Buffer.from(archiveData.data), Buffer.from(imageData.data)],
        {type: imageData.type}
    )
}