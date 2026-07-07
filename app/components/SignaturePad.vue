<script setup lang="ts">
/**
 * Lightweight, dependency-free signature pad.
 * Captures pointer (mouse + touch) strokes on a high-DPI canvas.
 *
 * The drawn strokes are held on the canvas but are NOT committed to v-model
 * until the client presses "Sign" and acknowledges the ID-match reminder.
 * This makes signing mandatory: forms validate that the model (data URL) is
 * non-empty, so an unsigned-but-drawn pad still fails validation.
 * The v-model contract is unchanged: string PNG data URL, '' when empty.
 */
const model = defineModel<string>({ default: '' })

const canvas = ref<HTMLCanvasElement | null>(null)
const okButton = ref<HTMLButtonElement | null>(null)
const isEmpty = ref(true)
const signed = ref(false)
const showDialog = ref(false)
let ctx: CanvasRenderingContext2D | null = null
let drawing = false
let last: { x: number; y: number } | null = null

function setupCanvas() {
  const el = canvas.value
  if (!el) return
  const ratio = Math.max(window.devicePixelRatio || 1, 1)
  const rect = el.getBoundingClientRect()
  el.width = rect.width * ratio
  el.height = rect.height * ratio
  ctx = el.getContext('2d')
  if (!ctx) return
  ctx.scale(ratio, ratio)
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#1f232d'
}

function pos(e: PointerEvent) {
  const rect = canvas.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function start(e: PointerEvent) {
  if (!ctx || signed.value) return // locked once signed
  drawing = true
  last = pos(e)
  canvas.value!.setPointerCapture(e.pointerId)
}

function move(e: PointerEvent) {
  if (!drawing || !ctx || !last) return
  const p = pos(e)
  ctx.beginPath()
  ctx.moveTo(last.x, last.y)
  ctx.lineTo(p.x, p.y)
  ctx.stroke()
  last = p
  isEmpty.value = false
}

function end() {
  if (!drawing) return
  drawing = false
  last = null
  // Intentionally NOT committing to the model here — see component note.
}

function clear() {
  if (!ctx || !canvas.value) return
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  isEmpty.value = true
  signed.value = false
  showDialog.value = false
  model.value = ''
}

// Step 1: client presses "Sign" → show the ID-match reminder.
function openSignDialog() {
  if (isEmpty.value || signed.value) return
  showDialog.value = true
}

// Step 2: client acknowledges → commit the signature and show the green badge.
function confirmSign() {
  signed.value = true
  showDialog.value = false
  model.value = canvas.value!.toDataURL('image/png')
}

watch(showDialog, (open) => {
  if (open) nextTick(() => okButton.value?.focus())
})

defineExpose({ clear, isEmpty })

onMounted(() => {
  setupCanvas()
  window.addEventListener('resize', setupCanvas)
})
onBeforeUnmount(() => window.removeEventListener('resize', setupCanvas))
</script>

<template>
  <div class="sig">
    <canvas
      ref="canvas"
      class="sig__canvas"
      :class="{ 'is-signed': signed }"
      @pointerdown.prevent="start"
      @pointermove.prevent="move"
      @pointerup="end"
      @pointerleave="end"
    />
    <span v-if="isEmpty" class="sig__hint">Draw signature here</span>

    <div class="sig__actions">
      <button
        v-if="!signed"
        type="button"
        class="sig__sign"
        :disabled="isEmpty"
        @click="openSignDialog"
      >
        Sign
      </button>
      <span v-else class="sig__badge" role="status">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="currentColor" />
          <path
            d="M7 12.5 l3.2 3.2 L17 8.5"
            fill="none"
            stroke="#fff"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Signed
      </span>

      <button type="button" class="sig__clear" @click="clear">
        {{ signed ? 'Clear &amp; re-sign' : 'Clear signature' }}
      </button>
    </div>

    <!-- Mandatory ID-match acknowledgement -->
    <div
      v-if="showDialog"
      class="sig__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sig-dialog-msg"
    >
      <div class="sig__modal">
        <p id="sig-dialog-msg" class="sig__modal-msg">
          Please ensure your signature matches the one on your passport or ID to
          avoid processing delays.
        </p>
        <button ref="okButton" type="button" class="sig__ok" @click="confirmSign">
          OK
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sig {
  position: relative;
}
.sig__canvas {
  display: block;
  width: 100%;
  height: 220px;
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  background: #fff;
  touch-action: none;
  cursor: crosshair;
}
.sig__canvas.is-signed {
  border-style: solid;
  border-color: var(--success);
  cursor: default;
}
.sig__hint {
  position: absolute;
  top: 110px;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #94a3b8;
  font-size: 1rem;
  pointer-events: none;
}
.sig__actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.sig__sign {
  background: var(--blue);
  color: #fff;
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  font-weight: 600;
  padding: 10px 28px;
  min-height: 44px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.sig__sign:hover:not(:disabled) {
  background: var(--blue-hover);
}
.sig__sign:disabled {
  background: var(--line);
  color: var(--muted);
  cursor: not-allowed;
}
.sig__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--success);
  font-weight: 700;
}
.sig__badge svg {
  width: 22px;
  height: 22px;
}
.sig__clear {
  background: none;
  border: none;
  color: var(--blue);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 0;
  min-height: 44px;
  margin-left: auto;
}
.sig__clear:hover {
  text-decoration: underline;
}

/* Acknowledgement dialog */
.sig__overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(6, 13, 22, 0.55);
}
.sig__modal {
  background: var(--surface);
  border-radius: var(--radius-card);
  padding: 32px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 24px 60px rgba(6, 13, 22, 0.35);
  text-align: center;
}
.sig__modal-msg {
  margin: 0 0 24px;
  color: var(--ink);
  font-size: 1.05rem;
  line-height: 1.5;
}
.sig__ok {
  background: var(--blue);
  color: #fff;
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  font-weight: 600;
  padding: 12px 40px;
  min-height: 48px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.sig__ok:hover {
  background: var(--blue-hover);
}
</style>
