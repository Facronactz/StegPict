<template>
  <h1>Home</h1>
  <div>
    <input type="file" id ="image" accept="image/*" @change="onImageChange">
    <input type="file" id ="archive" accept=".rar" @change="onArchiveChange">
  </div>
  <button @click="handleClick" :disabled="!image || !archive" >Process</button>
</template>

<script setup>
import {ref} from 'vue'

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
    image.value.imageType = image.value.type.split('/')[1]
  }
  const onArchiveChange = (event) => {
    archive.value = event.target.files[0]
    archive.value.fileType = archive.value.type.split('/')[1]
  }

  const handleClick = () => {
    status.value = "initializing"
    if(!image || !archive) {
      handleError("No file selected")
      return;
    }
    if(image.value.fileType !== "image" || archive.value.fileType !== "x-compressed") {
      handleError("Invalid file type")
      return;
    }
    process(image.value, archive.value)
  }

  const process = async (image, archive) => {
    status.value = "processing"
    const imageData = await readData(image)
    const archiveData = await readData(archive)

    const mergedFile = await mergeFile(imageData, archiveData)
    downloadFile(mergedFile, `merged.${image.imageType}`)
  }


  const mergeFile = async (image, archive) => {
    status.value = "merging"
    try {
      // Merge buffers
      const merged = new Uint8Array(image.byteLength + archive.byteLength)
      merged.set(new Uint8Array(image), 0)
      merged.set(new Uint8Array(archive), image.byteLength)
      return new Blob([merged], {type: image.type})
    } catch (err) {
      handleError(err)
    }
  }

  const readData = async (file) => {
    status.value = "reading file"
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
    status.value = "downloading"
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