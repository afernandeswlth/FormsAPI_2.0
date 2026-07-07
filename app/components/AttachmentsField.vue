<script setup lang="ts">
import { icons } from '../assets/icons'
import {
  processFile,
  dataUrlBytes,
  MAX_ATTACHMENT_BYTES,
  MAX_TOTAL_ATTACHMENT_BYTES,
} from '../utils/attachments'

export type Attachment = { name: string; type: string; size: number; content: string }

const files = defineModel<Attachment[]>({ required: true })

const props = withDefaults(
  defineProps<{
    title?: string
    hint?: string
    /** When > 0, shows a required marker + "n / requiredCount added" badge. */
    requiredCount?: number
    accept?: string
    maxBytes?: number
    /** Larger aqua drop zone (used by Redraw). */
    large?: boolean
    /** Drop the top divider when used as the sole content of a card. */
    flush?: boolean
  }>(),
  {
    title: 'Attachments',
    hint: '',
    requiredCount: 0,
    accept: '.pdf,image/*',
    maxBytes: 10 * 1024 * 1024,
    large: false,
    flush: false,
  },
)

const error = ref('')
const dragging = ref(false)
const ACCEPTED = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/heic',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const met = computed(() => files.value.length >= props.requiredCount)

async function addFiles(list: FileList | File[]) {
  error.value = ''
  const next = [...files.value]
  for (const f of Array.from(list)) {
    if (f.type && !ACCEPTED.includes(f.type)) {
      error.value = `${f.name} is not a supported file type (PDF or image).`
      continue
    }
    // Avoid processing absurdly large originals (images are compressed below).
    if (f.size > props.maxBytes) {
      error.value = `${f.name} is too large. Please upload a file under 10MB.`
      continue
    }
    const processed = await processFile(f)
    if (dataUrlBytes(processed.content) > MAX_ATTACHMENT_BYTES) {
      error.value = `${f.name} is too large to upload (max ~3MB per file). If it's a PDF, please upload a smaller file or a photo.`
      continue
    }
    const total = next.reduce((s, a) => s + dataUrlBytes(a.content), 0) + dataUrlBytes(processed.content)
    if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
      error.value = `These files are too large in total (max ~4MB). Please remove one or upload smaller files.`
      continue
    }
    next.push(processed)
  }
  files.value = next
}

async function onInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) await addFiles(input.files)
  input.value = ''
}
async function onDrop(e: DragEvent) {
  dragging.value = false
  if (e.dataTransfer?.files) await addFiles(e.dataTransfer.files)
}
function remove(i: number) {
  files.value = files.value.filter((_, idx) => idx !== i)
}
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="uploads" :class="{ 'uploads--flush': flush }">
    <h3>
      {{ title }}
      <span v-if="requiredCount > 0" class="req">*</span>
      <span v-if="requiredCount > 0" class="upload-count" :class="{ 'is-met': met }">
        {{ files.length }} / {{ requiredCount }} added
      </span>
    </h3>
    <p v-if="hint" class="muted small">{{ hint }}</p>

    <label
      class="dropzone"
      :class="{ 'is-drag': dragging, 'dropzone--lg': large }"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input
        type="file"
        :accept="accept"
        multiple
        class="dropzone__input"
        @change="onInput"
      />
      <span class="dropzone__icon" v-html="icons.upload" />
      <span class="dropzone__text"><strong>Add file</strong> or drag and drop</span>
    </label>

    <ul v-if="files.length" class="files">
      <li v-for="(a, i) in files" :key="i" class="file">
        <span class="file__icon" v-html="icons.fileDoc" />
        <span class="file__meta">
          <strong>{{ a.name }}</strong>
          <em>{{ formatSize(a.size) }}</em>
        </span>
        <button
          type="button"
          class="file__remove"
          :aria-label="`Remove ${a.name}`"
          v-html="icons.trash"
          @click="remove(i)"
        />
      </li>
    </ul>

    <p v-if="error" class="file-err">{{ error }}</p>
  </div>
</template>
