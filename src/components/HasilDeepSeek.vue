<template>
  <div>
    <input type="file" @change="handleFile('picture', $event)" accept="image/*">
    <input type="file" @change="handleFile('rar', $event)" accept=".rar">
    <button @click="mergeFiles" :disabled="!files.picture || !files.rar">
      {{ merging ? 'Merging...' : 'Merge & Download' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      files: {
        picture: null,
        rar: null
      },
      merging: false,
      error: null
    }
  },
  methods: {
    handleFile(type, event) {
      this.files[type] = event.target.files[0]
      this.error = null
    },

    async mergeFiles() {
      if (!this.files.picture || !this.files.rar) {
        this.error = 'Please select both files'
        return
      }

      this.merging = true
      this.error = null

      try {
        // Read both files as ArrayBuffers
        const buffers = await Promise.all([
          this.readFile(this.files.picture),
          this.readFile(this.files.rar)
        ])

        // Merge buffers
        const merged = new Uint8Array(buffers[0].byteLength + buffers[1].byteLength)
        merged.set(new Uint8Array(buffers[0]), 0)
        merged.set(new Uint8Array(buffers[1]), buffers[0].byteLength)

        // Create downloadable file
        const blob = new Blob([merged], { type: this.files.picture.type })
        this.triggerDownload(blob)
      } catch (err) {
        this.error = 'Failed to merge files: ' + err.message
      } finally {
        this.merging = false
      }
    },

    readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
      })
    },

    triggerDownload(blob) {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `merged-${Date.now()}.${this.files.picture.name.split('.').pop()}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style>
.error {
  color: #ff4444;
  margin-top: 8px;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>