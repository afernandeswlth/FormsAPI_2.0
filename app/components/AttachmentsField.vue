<script setup lang="ts">
import { icons } from '../assets/icons'
import { processFile, MAX_TOTAL_ATTACHMENT_BYTES } from '../utils/attachments'

export type Attachment = { name: string; type: string; size: number; path: string }

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
    showErrors?: boolean
  }>(),
  {
    title: 'Attachments',
    hint: '',
    requiredCount: 0,
    accept: '.pdf,image/*',
    maxBytes: 10 * 1024 * 1024,
    large: false,
    flush: false,
    showErrors: false,
  },
)

const error = ref('')
const dragging = ref(false)
const uploading = ref(false)
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
  uploading.value = true
  try {
    for (const f of Array.from(list)) {
      if (f.type && !ACCEPTED.includes(f.type)) {
        error.value = `${f.name} is not a supported file type (PDF or image).`
        continue
      }
      const currentTotal = files.value.reduce((s, a) => s + (a.size || 0), 0)
      if (currentTotal + f.size > MAX_TOTAL_ATTACHMENT_BYTES) {
        error.value = `Attachments would exceed 25MB in total. Please remove one or upload smaller files.`
        continue
      }
      try {
        const processed = await processFile(f)
        files.value = [...files.value, processed]
      } catch {
        error.value = `Could not upload ${f.name}. Please try again.`
      }
    }
  } finally {
    uploading.value = false
  }
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

    <p v-if="uploading" class="muted small">Uploading…</p>

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
    <span v-if="showErrors && requiredCount > 0 && !met" class="field__err">
      Attach at least {{ requiredCount }} supporting document{{ requiredCount > 1 ? 's' : '' }}.
    </span>
  </div>
</template>
