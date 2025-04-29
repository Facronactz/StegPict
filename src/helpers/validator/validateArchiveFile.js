export default function validateArchiveFile({file, maxFileSize, maxFileSizeMB, setError}) {
    if (!file) return false
    if (!file.name.toLowerCase().endsWith('.rar')) {
        setError('Invalid archive file type')
        return false
    }
    if (file.size > maxFileSize) {
        setError(`Archive file exceeds ${maxFileSizeMB}MB limit`)
        return false
    }
    return true
}