<template>
  <div class="container">
    <h1>File Merger</h1>

    <div class="form-container">
      <div class="form-section">
        <h2>Input Files</h2>

        <div class="input-group">
          <label for="image">Image File (JPEG/PNG):</label>
          <div class="file-input">
            <input
                type="file"
                id="image"
                accept="image/*"
                @change="onImageChange"
            >
            <span class="file-name">{{ image?.name || 'Select image...' }}</span>
          </div>
        </div>

        <div class="input-group">
          <label for="archive">Archive File (RAR):</label>
          <div class="file-input">
            <input
                type="file"
                id="archive"
                accept=".rar"
                @change="onArchiveChange"
            >
            <span class="file-name">{{ archive?.name || 'Select archive...' }}</span>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h2>Output Settings</h2>

        <div class="input-group">
          <label for="output">Output File Name:</label>
          <input
              type="text"
              id="output"
              v-model="outputName"
              placeholder="Enter output name"
          >
        </div>

        <div class="input-group">
          <label class="checkbox-label">
            <input
                type="checkbox"
                v-model="checkForArchive"
            >
            Check for existing archive data
          </label>
        </div>
      </div>

      <div class="form-section">
        <h2 @click="showAdvanced = !showAdvanced" class="section-toggle">
          Advanced Settings ▼
        </h2>

        <div v-if="showAdvanced" class="advanced-settings">

          <div class="input-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="parallelProcessing">
              Parallel Processing (Web Workers)
            </label>
            <label>Worker Pool Size:</label>
            <input
                type="number"
                v-model.number="workerPoolSize"
                min="1"
                max="16"
                :disabled="!parallelProcessing"
            >
          </div>

          <div class="input-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="chunkedProcessing">
              Enable Chunked Processing
            </label>
          </div>

          <div class="input-group">
            <label>Max File Size (MB):</label>
            <input
                type="number"
                v-model.number="maxFileSizeMB"
                min="1"
                max="1024"
            >
          </div>

          <div class="input-group">
            <label>Archive Check Limit (KB):</label>
            <input
                type="number"
                v-model.number="archiveCheckLimitKB"
                min="1"
                max="10240"
            >
          </div>

          <div class="input-group" v-if="chunkedProcessing">
            <label>Chunk Size (KB):</label>
            <input
                type="number"
                v-model.number="chunkSizeKB"
                min="64"
                max="4096"
            >
          </div>

          <div class="input-group">
            <label>Merge Order:</label>
            <select v-model="mergeOrder">
              <option value="append">Append Archive to Image</option>
              <option value="prepend">Prepend Archive to Image</option>
            </select>
          </div>

          <div class="input-group">
            <label>Output Format:</label>
            <select v-model="outputFormat">
              <option value="original">Original Image Format</option>
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="custom">Custom Binary</option>
            </select>
          </div>

          <div class="input-group" v-if="outputFormat === 'custom'">
            <label>Custom File Extension:</label>
            <input
                type="text"
                v-model="customExtension"
                placeholder="bin"
            >
          </div>

          <!-- Forensic Watermarking -->
          <div class="input-group">
            <label>Forensic Watermark:</label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="embedWatermark">
              Enable Steganographic Watermark
            </label>
            <input
                type="text"
                v-model="watermarkText"
                placeholder="Enter watermark identifier"
                :disabled="!embedWatermark"
            >
          </div>

          <!-- Metadata Removal -->
          <div class="input-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="removeMetadata">
              Remove Image Metadata:
            </label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" :disabled="!removeMetadata" v-model="metadataSettings.exif">
                EXIF Data
              </label>
              <label class="checkbox-label">
                <input type="checkbox" :disabled="!removeMetadata" v-model="metadataSettings.xmp">
                XMP Data
              </label>
              <label class="checkbox-label">
                <input type="checkbox" :disabled="!removeMetadata" v-model="metadataSettings.iptc">
                IPTC Data
              </label>
            </div>
          </div>
          <div class="input-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="enableCompression">
              Enable Archive Compression
            </label>
          </div>
        </div>
      </div>

      <div class="preview-section" v-if="imagePreview">
        <h3>Image Preview</h3>
        <img :src="imagePreview" class="image-preview">
      </div>

      <div class="status-area">
        <div class="progress-bar" :style="{ width: progress + '%' }" v-if="showProgress"></div>
        <div class="status-message" :class="statusClass">
          <span v-html="statusMessage"></span>
        </div>
      </div>

      <button
          class="process-button"
          @click="handleClick"
          :disabled="!isProcessable"
      >
        <span v-if="!processing">Merge Files</span>
        <span v-else>Processing...</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, watch} from 'vue'
import ExifReader from 'exifreader';

// Reactive state
const archive = ref(null)
const image = ref(null)
const outputName = ref("merged")
const status = ref("idle")
const error = ref(null)
const checkForArchive = ref(true)
const imagePreview = ref(null)
const progress = ref(0)
const showProgress = ref(false)

// Advanced settings
const showAdvanced = ref(false)
const parallelProcessing = ref(false);
const workerPoolSize = ref(4)
const chunkedProcessing = ref(false)
const maxFileSizeMB = ref(50)
const archiveCheckLimitKB = ref(1024) // 1MB
const chunkSizeKB = ref(512)
const mergeOrder = ref('append')
const outputFormat = ref('original')
const customExtension = ref('bin')
const removeMetadata = ref(true);
const metadataSettings = ref({
  exif: true,
  xmp: true,
  iptc: true
});
const enableCompression = ref(false);
const watermarkText = ref('');
const embedWatermark = ref(false);

// Computed properties
const maxFileSize = computed(() => maxFileSizeMB.value * 1024 * 1024)
const archiveCheckLimit = computed(() => archiveCheckLimitKB.value * 1024)
const chunkSize = computed(() => chunkSizeKB.value * 1024)

const statusClass = computed(() => ({
  'status-idle': status.value === 'idle',
  'status-error': status.value === 'error',
  'status-success': status.value === 'success',
  'status-processing': status.value === 'processing'
}))

const statusMessage = computed(() => {
  const messages = {
    idle: 'Ready to process files',
    initializing: 'Initializing processing...',
    processing: 'Processing files...',
    merging: 'Merging files...',
    downloading: 'Preparing download...',
    success: '✅ Files merged successfully!',
    error: `❌ Error: ${error.value || 'Unknown error'}`
  }
  return messages[status.value] || 'Unknown status'
})

const isProcessable = computed(() =>
    !!image.value &&
    !!archive.value &&
    status.value !== 'processing' &&
    !error.value
)

const processing = computed(() => status.value === 'processing')

// Watch for invalid inputs
watch(maxFileSizeMB, (val) => {
  if (val < 1) maxFileSizeMB.value = 1
  if (val > 1024) maxFileSizeMB.value = 1024
})

watch(archiveCheckLimitKB, (val) => {
  if (val < 1) archiveCheckLimitKB.value = 1
  if (val > 10240) archiveCheckLimitKB.value = 10240
})

watch(workerPoolSize, (newVal) => {
  if (newVal < 1) workerPoolSize.value = 1;
  if (newVal > 16) workerPoolSize.value = 16;
  initializeWorkers();
});

// Web Worker Management
let workerPool = ref([]);

const initializeWorkers = () => {
  // Cleanup existing workers
  workerPool.value.forEach(worker => worker.terminate());

  // Create new pool
  workerPool.value = Array.from({ length: workerPoolSize.value }, () =>
      new Worker(new URL('./file-worker.js', import.meta.url))
  );
};

const processInParallel = async (imageData, archiveData) => {
  const chunkSize = Math.ceil(imageData.length / workerPool.length);
  const chunks = Array.from({ length: workerPool.length }, (_, i) =>
      imageData.slice(i * chunkSize, (i + 1) * chunkSize)
  );

  const results = await Promise.all(
      workerPool.map((worker, i) =>
          new Promise((resolve) => {
            worker.postMessage({ chunk: chunks[i], index: i });
            worker.onmessage = (e) => resolve(e.data);
          })
      )
  );

  return Buffer.concat(results);
};

// File handlers
const onImageChange = (event) => {
  resetStatus()
  const file = event.target.files[0]
  if (!validateImageFile(file)) return
  image.value = file
  createImagePreview(file)
}

const onArchiveChange = (event) => {
  resetStatus()
  const file = event.target.files[0]
  if (!validateArchiveFile(file)) return
  archive.value = file
}

// Validation
const validateImageFile = (file) => {
  if (!file) return false
  if (!file.type.startsWith('image/')) {
    setError('Invalid image file type')
    return false
  }
  if (file.size > maxFileSize.value) {
    setError(`Image file exceeds ${maxFileSizeMB.value}MB limit`)
    return false
  }
  return true
}

const validateArchiveFile = (file) => {
  if (!file) return false
  if (!file.name.toLowerCase().endsWith('.rar')) {
    setError('Invalid archive file type')
    return false
  }
  if (file.size > maxFileSize.value) {
    setError(`Archive file exceeds ${maxFileSizeMB.value}MB limit`)
    return false
  }
  return true
}

// Main processing
const handleClick = async () => {
  try {
    resetStatus()
    showProgress.value = true
    status.value = 'initializing'

    let [imageData, archiveData] = await Promise.all([
      readFileWithProgress(image.value, 0),
      readFileWithProgress(archive.value, 50)
    ])

    if (checkForArchive.value && await containsArchiveData(imageData.data)) {
      throw new Error('Image already contains archive data')
    }

    if (removeMetadata.value) {
      imageData = await stripMetadata(new Blob([imageData]))
    }

    status.value = 'merging'
    progress.value = 75
    const mergedFile = await mergeFiles(imageData, archiveData)

    status.value = 'downloading'
    progress.value = 90
    await downloadFile(mergedFile, `${outputName.value}.${getFileExtension()}`)

    status.value = 'success'
    progress.value = 100
    setTimeout(() => resetStatus(), 2000)
  } catch (err) {
    setError(err.message)
  } finally {
    showProgress.value = false
  }
}

// File operations
const readFileWithProgress = (file, targetProgress) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        progress.value = targetProgress * (e.loaded / e.total)
      }
    }

    reader.onload = () => resolve({
      data: reader.result,
      type: file.type,
      name: file.name
    })

    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsArrayBuffer(file)
  })
}

const containsArchiveData = async (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer)
  const signature = [82, 97, 114, 33] // "Rar!" ASCII codes

  // Search first 1MB for performance
  const searchLimit = Math.min(bytes.length, archiveCheckLimit.value)
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

// Chunked processing implementation
const readFileChunked = async (file) => {
  return new Promise((resolve, reject) => {
    const chunks = []
    const totalChunks = Math.ceil(file.size / chunkSize.value)
    let chunksProcessed = 0

    const readChunk = (offset) => {
      const reader = new FileReader()
      const chunk = file.slice(offset, offset + chunkSize.value)

      reader.onload = (e) => {
        chunks.push(e.target.result)
        chunksProcessed++
        progress.value = (chunksProcessed / totalChunks) * 50

        if (offset + chunkSize.value < file.size) {
          readChunk(offset + chunkSize.value)
        } else {
          resolve(chunks)
        }
      }

      reader.onerror = reject
      reader.readAsArrayBuffer(chunk)
    }

    readChunk(0)
  })
}

const mergeFiles = async (imageData, archiveData) => {
  if (chunkedProcessing.value) return mergeFilesChunked(imageData, archiveData)
  try {
    const mergedArray = new Uint8Array(
        imageData.data.byteLength + archiveData.data.byteLength
    )
    mergedArray.set(new Uint8Array(imageData.data), 0)
    mergedArray.set(new Uint8Array(archiveData.data), imageData.data.byteLength)
    return new Blob([mergedArray], {type: imageData.type})
  } catch (err) {
    throw new Error('Failed to merge files: ' + err.message)
  }
}

const mergeFilesChunked = async (imageData, archiveData) => {
  const mergedBlob = new Blob(
      mergeOrder.value === 'append'
          ? [imageData.data, archiveData.data]
          : [archiveData.data, imageData.data],
      {type: imageData.type}
  )
  return mergedBlob
}

const downloadFile = (blob, fileName) => {
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

// Metadata Removal
const stripMetadata = async (imageFile) => {
  const tags = ExifReader.load(imageFile);
  const img = new Image();
  img.src = URL.createObjectURL(imageFile);

  img.onerror = () => {
    throw new Error('Failed to load image');
  };
  return new Promise((resolve) => {
    img.onload = () => {
      if (!tags || !tags.exif) {
        resolve(imageFile);
        return;
      }
      delete tags.exif;
      if (tags.gps) {
        delete tags.gps;
      }
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(resolve, imageFile.type);
    };
  });
};

// Helpers
const getFileExtension = () => {
  if (outputFormat.value === 'custom') return customExtension.value
  if (outputFormat.value !== 'original') return outputFormat.value
  return image.value.name.split('.').pop().toLowerCase()
}

const createImagePreview = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => imagePreview.value = e.target.result
  reader.readAsDataURL(file)
}

const setError = (message) => {
  error.value = message
  status.value = 'error'
  progress.value = 0
  setTimeout(resetStatus, 5000)
}

const resetStatus = () => {
  error.value = null
  status.value = 'idle'
  progress.value = 0
  showProgress.value = false
}
</script>

<style scoped>
.container {
  margin: 2rem auto;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
}

.form-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
}

.form-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

h2 {
  color: #34495e;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.input-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #4a5568;
  font-weight: 500;
}

.file-input {
  position: relative;
  display: inline-block;
  width: 100%;
}

.file-input input[type="file"] {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.file-name {
  display: block;
  padding: 0.75rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  color: #4a5568;
}

input[type="text"] {
  width: 80%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.status-area {
  margin: 2rem 0;
  position: relative;
  height: 40px;
}

.progress-bar {
  height: 4px;
  background: #48bb78;
  transition: width 0.3s ease;
  position: absolute;
  top: 0;
  left: 0;
}

.status-message {
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.status-idle {
  background: #e2e8f0;
  color: #4a5568;
}

.status-error {
  background: #fed7d7;
  color: #c53030;
}

.status-success {
  background: #c6f6d5;
  color: #2f855a;
}

.status-processing {
  background: #bee3f8;
  color: #2b6cb0;
}

.process-button {
  width: 100%;
  padding: 1rem;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.process-button:hover:not(:disabled) {
  background: #3182ce;
}

.process-button:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

.image-preview {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  margin-top: 1rem;
  border: 2px solid #e2e8f0;
}

.preview-section {
  text-align: center;
  margin: 2rem 0;
}
</style>