<script setup lang="ts">
import { icons } from '../assets/icons'

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

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function addFiles(list: FileList | File[]) {
  error.value = ''
  const next = [...files.value]
  for (const f of Array.from(list)) {
    if (f.size > props.maxBytes) {
      error.value = `${f.name} is larger than 10MB.`
      continue
    }
    if (f.type && !ACCEPTED.includes(f.type)) {
      error.value = `${f.name} is not a supported file type (PDF or image).`
      continue
    }
    next.push({ name: f.name, type: f.type, size: f.size, content: await readAsDataURL(f) })
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
