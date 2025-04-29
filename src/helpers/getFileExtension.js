export default function getFileExtension(outputFormat, customExtension, image) {
    if (outputFormat === 'custom') return customExtension
    if (outputFormat !== 'original') return outputFormat
    return image.name.split('.').pop().toLowerCase()
}