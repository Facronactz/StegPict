<template>
  <h1>Home</h1>
  <div>
    <input type="file" id ="image" accept="image/*" @change="onImageChange">
    <input type="file" id ="archive" accept=".rar" @change="onArchiveChange">
  </div>
  <button @click="process" :disabled="!image || !archive" >Process</button>
</template>

<script setup>
  import { ref } from 'vue'
  const archive = ref(null)
  const image = ref(null)
  const status = ref("idle")

  const handleError = (err) => {
    status.value = "error"
    console.error(err)
  }

  const onImageChange = (event) => {
    image.value = event.target.files[0]
    image.value.fileType = image.value.type.split('/')[0]
  }
  const onArchiveChange = (event) => {
    archive.value = event.target.files[0]
    archive.value.fileType = archive.value.type.split('/')[1]
  }

  const process = () => {
    status.value = "initializing"
    if(!image || !archive) {
      handleError("No file selected")
      return;
    }
    if(image.value.fileType !== "image" || archive.value.fileType !== "x-compressed") {
      handleError("Invalid file type")
      return;
    }
    mergeFile(image.value, archive.value)
  }

  const mergeFile = async (image, archive) => {
    status.value = "processing"
    try {
      const imageData = await readFile(image)
      const archiveData = await readFile(archive)

      status.value = "merging"
      // Merge buffers
      const merged = new Uint8Array(imageData.byteLength + archiveData.byteLength)
      merged.set(new Uint8Array(imageData), 0)
      merged.set(new Uint8Array(archiveData), imageData.byteLength)
      const blob = new Blob([merged], { type: image.type })

      // Create downloadable file
      status.value = "downloading"
      downloadFile(blob, "merged.jpg")

      status.value = "idle"
    } catch (err) {
      handleError(err)
    }
  }

  const readFile = async (file) => {
    status.value = "reading"
    const reader = new FileReader()
    reader.readAsArrayBuffer(file)
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        resolve(reader.result)
      }
      reader.onerror = () => {
        reject(reader.error)
      }
    })
  }

  const downloadFile = (blob, fileName) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

</script>

<style scoped>
button {
  margin-top: 1em;
}
</style>