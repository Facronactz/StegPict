export default function createImagePreview(file, previewRef) {
    const reader = new FileReader()
    reader.onload = (e) => (previewRef.value = e.target.result)
    reader.readAsDataURL(file)
}