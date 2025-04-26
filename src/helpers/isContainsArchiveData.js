export default async function isContainsArchiveData(arrayBuffer, archiveCheckLimit) {
    const bytes = new Uint8Array(arrayBuffer)
    const signature = [82, 97, 114, 33] // "Rar!" ASCII codes

    // Search first 1MB for performance
    const searchLimit = Math.min(bytes.length, archiveCheckLimit)
    for (let i = 0; i < searchLimit - 3; i++) {
        if (bytes[i] === signature[0] &&
            bytes[i + 1] === signature[1] &&
            bytes[i + 2] === signature[2] &&
            bytes[i + 3] === signature[3]) {
            return true
        }
    }
    return false
}