/**
 * Client-side attachment processing.
 *
 * Uploads are sent as base64 inside the JSON request body, and Vercel's
 * serverless functions reject bodies over ~4.5MB. So we downscale + JPEG-
 * compress images before upload (phone photos are often 3-8MB) and keep the
 * total under the limit. PDFs and undecodable images pass through unchanged and
 * are size-guarded by the caller.
 */
export type ProcessedAttachment = { name: string; type: string; size: number; content: string }

// Per-file and total caps for the encoded content (leaves margin under 4.5MB).
export const MAX_ATTACHMENT_BYTES = 3.5 * 1024 * 1024
export const MAX_TOTAL_ATTACHMENT_BYTES = 4 * 1024 * 1024

/** Approximate decoded byte size of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',')
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl
  return Math.floor(b64.length * 0.75)
}

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = src
  })
}

/** Downscale to <=2000px on the long edge and JPEG-compress under the size cap. */
async function compressImage(file: File): Promise<ProcessedAttachment | null> {
  try {
    const img = await loadImage(await readAsDataURL(file))
    const maxDim = 2000
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff' // flatten any transparency for JPEG
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    let content = canvas.toDataURL('image/jpeg', 0.72)
    for (const q of [0.6, 0.5, 0.4]) {
      if (dataUrlBytes(content) <= MAX_ATTACHMENT_BYTES) break
      content = canvas.toDataURL('image/jpeg', q)
    }
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return { name, type: 'image/jpeg', size: dataUrlBytes(content), content }
  } catch {
    return null
  }
}

/** Turn a File into an upload-ready attachment (compressing images when possible). */
export async function processFile(file: File): Promise<ProcessedAttachment> {
  const compressible = ['image/png', 'image/jpeg', 'image/webp']
  if (compressible.includes(file.type)) {
    const compressed = await compressImage(file)
    if (compressed) return compressed
  }
  const content = await readAsDataURL(file)
  return { name: file.name, type: file.type, size: file.size, content }
}
