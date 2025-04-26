export default async function downloadFile(blob, fileName) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        setTimeout(() => {
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            resolve()
        }, 100)
    })
}