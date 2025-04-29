<template>
  <div class="container">
    <h1>File Merger</h1>

    <div class="form-container">
      <div class="form-section">
        <h2>Input Files</h2>

        <div class="input-group">
          <label for="image">Image File</label>
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
      </div>

      <div class="form-section">
        <h2 @click="showAdvanced = !showAdvanced" class="section-toggle">
          Advanced Settings
          <span class="arrow">{{ showAdvanced ? '▲' : '▼' }}</span>
        </h2>

        <div v-if="showAdvanced" class="advanced-settings">

          <div class="input-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="parallelProcessing">
              Enable Parallel Processing (Web Workers)
            </label>
          </div>

          <div class="input-group" v-if="parallelProcessing">
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

          <div class="input-group">
            <label>Merge Order:</label>
            <select v-model="mergeOrder">
              <option value="append">Append Archive to Image</option>
              <option value="prepend">Prepend Archive to Image</option>
            </select>
          </div>

          <!-- Forensic Watermarking -->
          <div class="input-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="embedWatermark">
              Enable Forensic Watermark
            </label>
          </div>

          <div class="input-group" v-if="embedWatermark">
            <input
                type="text"
                v-model="watermarkText"
                placeholder="Enter watermark identifier"
            >
          </div>

          <!-- Metadata Removal -->
          <div class="input-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="removeMetadata" disabled>
              Remove Image Metadata
            </label>
            <div class="checkbox-group" v-if="removeMetadata">
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
import {computed, ref, watch} from 'vue'
import createImagePreview from "../helpers/createImagePreview.js";
import getFileExtension from "../helpers/getFileExtension.js";
import downloadFile from "../services/DownloadResult.js";
import isContainsArchiveData from "../helpers/isContainsArchiveData.js";
import validateImageFile from "../helpers/validator/validateImageFile.js";
import validateArchiveFile from "../helpers/validator/validateArchiveFile.js";
import stripMetadata from "../services/StripMetadata.js";
import {mergeFilesChunked, readFileChunked} from "../services/ChunkedProcessing.js";
import {mergeFiles, readFile} from "../services/FileOperation.js";
import {mergeFilePipeline, readFilePipeline} from "../services/ProcessPipeline.js";
import {initializeWorkers, processInParallel} from "../services/ParallelProcessing.js";

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
const removeMetadata = ref(false);
const metadataSettings = ref({
  exif: false,
  xmp: false,
  iptc: false
});
const enableCompression = ref(false);
const watermarkText = ref('');
const embedWatermark = ref(false);
let workerPool = ref([]);

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
    !processing.value &&
    !error.value
)

const processing = computed(() => status.value !== 'idle')

// Watch for invalid inputs
watch(maxFileSizeMB, (val) => {
  if (val < 1) maxFileSizeMB.value = 1
  if (val > 1024) maxFileSizeMB.value = 1024
})

watch(archiveCheckLimitKB, (val) => {
  if (val < 1) archiveCheckLimitKB.value = 1
  if (val > 10240) archiveCheckLimitKB.value = 10240
})

watch(workerPoolSize, (val) => {
  if (val < 1) workerPoolSize.value = 1;
  if (val > 16) workerPoolSize.value = 16;
  initializeWorkers({workerPool, workerPoolSize: workerPoolSize.value});
});

watch(chunkSizeKB, (val) => {
  if (val < 1) chunkSizeKB.value = 1
  if (val > 8192) chunkSizeKB.value = 8192
})

watch(parallelProcessing, (val) => {
  if (val) {
    initializeWorkers({workerPool, workerPoolSize: workerPoolSize.value});
  } else {
    workerPool.value.forEach(worker => worker.terminate());
    workerPool.value = [];
  }
});

watch(embedWatermark, (val) => {
  if (val) {
    watermarkText.value = 'StegPict by Facronactz';
  } else {
    watermarkText.value = '';
  }
});

// Web Worker Management

// const initializeWorkers = () => {
//   // Cleanup existing workers
//   workerPool.value.forEach(worker => worker.terminate());
//
//   // Create new pool
//   workerPool.value = Array.from({length: workerPoolSize.value}, () =>
//       new Worker(new URL('./file-worker.js', import.meta.url))
//   );
// };

// const processInParallel = async (imageData, archiveData) => {
//   const chunkSize = Math.ceil(imageData.length / workerPool.length);
//   const chunks = Array.from({length: workerPool.length}, (_, i) =>
//       imageData.slice(i * chunkSize, (i + 1) * chunkSize)
//   );
//
//   const results = await Promise.all(
//       workerPool.map((worker, i) =>
//           new Promise((resolve) => {
//             worker.postMessage({chunk: chunks[i], index: i});
//             worker.onmessage = (e) => resolve(e.data);
//           })
//       )
//   );
//
//   return Buffer.concat(results);
// };

// File handlers
const onImageChange = (event) => {
  resetStatus()
  imagePreview.value = null
  image.value = null
  const file = event.target.files[0]
  if (!validateImageFile({
    file,
    maxFileSize: maxFileSize.value,
    maxFileSizeMB: maxFileSizeMB.value,
    setError,
  })) return
  image.value = file
  createImagePreview(file, imagePreview)
}

const onArchiveChange = (event) => {
  resetStatus()
  archive.value = null
  const file = event.target.files[0]
  if (!validateArchiveFile({
    file,
    maxFileSize: maxFileSize.value,
    maxFileSizeMB: maxFileSizeMB.value,
    setError,
  })) return
  archive.value = file
}

// Main pipeline
const handleClick = async () => {
  try {
    resetStatus()
    showProgress.value = true
    status.value = 'initializing'

    let [imageData, archiveData] = await readFilePipeline({
      isChunked: chunkedProcessing.value,
      image: image.value,
      archive: archive.value,
      chunkSize: chunkSize.value,
      progress,
    })

    if (checkForArchive.value && await isContainsArchiveData(imageData.data, archiveCheckLimit.value)) {
      throw new Error('Image already contains archive data')
    }

    if (removeMetadata.value) {
      imageData = await stripMetadata(new Blob([imageData], metadataSettings.value))
    }

    let mergedFile
    if (parallelProcessing.value) {
      status.value = 'processing'
      progress.value = 75
      if (workerPool.value.length === 0)
        initializeWorkers({workerPool, workerPoolSize: workerPoolSize.value})

      const mergedData = await processInParallel({
        imageData: imageData.data,
        archiveData: archiveData.data,
        status,
        workerPool: workerPool.value,
        workerPoolSize: workerPoolSize.value,
        mergeOrder: mergeOrder.value
      })
      mergedFile = new Blob([mergedData], {type: `image/${getFileExtension(outputFormat.value, customExtension.value, image.value)}`})
    } else {
      status.value = 'merging'
      progress.value = 75
      mergedFile = await mergeFilePipeline({
        isChunked: chunkedProcessing.value,
        imageData,
        archiveData,
        mergeOrder: mergeOrder.value
      })
    }
    const resultFile = new Blob([mergedFile], {type: `image/${getFileExtension(outputFormat.value, customExtension.value, image.value)}`})
    status.value = 'downloading'
    progress.value = 90
    await downloadFile(resultFile, `${outputName.value}.${getFileExtension(outputFormat.value, customExtension.value, image.value)}`)

    status.value = 'success'
    progress.value = 100
    setTimeout(() => resetStatus(), 2000)
  } catch (err) {
    setError(err.message)
  } finally {
    showProgress.value = false
  }
}

// Helpers
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
  width: 85%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
}

select {
  box-sizing: content-box;
  width: 85%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
}

input[type="checkbox"] {
  margin-right: 0.5rem;
}

input[type="number"] {
  width: 85%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
}

input:disabled {
  background: #f7fafc;
  color: #a0aec0;
  cursor: not-allowed;
  pointer-events: none;
  opacity: 0.5;
  transition: opacity 0.2s;
  border-radius: 6px;
  border: 2px solid #e2e8f0;
}

.section-toggle {
  margin-bottom: 1rem;
  cursor: pointer;
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