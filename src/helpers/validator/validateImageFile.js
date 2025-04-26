export default function validateImageFile({file, maxFileSize, maxFileSizeMB, setError}) {
    if (!file) return false
    if (!file.type.startsWith('image/')) {
        setError('Invalid image file type')
        return false
    }
    if (file.size > maxFileSize) {
        setError(`Image file exceeds ${maxFileSizeMB}MB limit`)
        return false
    }
    return true
}