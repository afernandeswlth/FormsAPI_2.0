<script setup lang="ts">
/**
 * Lightweight, dependency-free signature pad.
 * Captures pointer (mouse + touch) strokes on a high-DPI canvas and emits the
 * trimmed PNG data URL. Swap for `signature_pad` later if desired — the
 * v-model contract (string data URL, '' when empty) stays the same.
 */
const model = defineModel<string>({ default: '' })

const canvas = ref<HTMLCanvasElement | null>(null)
const isEmpty = ref(true)
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
  if (!ctx) return
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
  model.value = isEmpty.value ? '' : canvas.value!.toDataURL('image/png')
}

function clear() {
  if (!ctx || !canvas.value) return
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  isEmpty.value = true
  model.value = ''
}

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
      @pointerdown.prevent="start"
      @pointermove.prevent="move"
      @pointerup="end"
      @pointerleave="end"
    />
    <span v-if="isEmpty" class="sig__hint">Draw signature here</span>
    <button type="button" class="sig__clear" @click="clear">Clear signature</button>
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
.sig__hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #94a3b8;
  font-size: 1rem;
  pointer-events: none;
}
.sig__clear {
  margin-top: 10px;
  background: none;
  border: none;
  color: var(--blue);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 0;
  min-height: 44px;
}
.sig__clear:hover {
  text-decoration: underline;
}
</style>
