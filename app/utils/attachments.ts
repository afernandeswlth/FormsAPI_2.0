import { createClient } from '@supabase/supabase-js'

/**
 * Client-side attachment handling.
 *
 * Files are uploaded straight to Supabase Storage (via a server-issued signed
 * URL) so they don't travel through Vercel's ~4.5MB request body — the form
 * submission only carries a small storage `path`. Photos are downscaled +
 * JPEG-compressed first to keep the final combined PDF/email reasonable.
 */
export type ProcessedAttachment = { name: string; type: string; size: number; path: string }

// Gmail's attachment ceiling — total across all files on a submission.
export const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = src
  })
}

/** Downscale to <=2000px on the long edge and JPEG-compress. Returns null on failure. */
async function compressImage(file: File): Promise<{ blob: Blob; name: string } | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const maxDim = 2000
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.72))
    if (!blob) return null
    return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.jpg' }
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Upload a blob to Supabase Storage via a server-issued signed URL; returns the path. */
async function signAndUpload(body: Blob, filename: string, type: string): Promise<string> {
  const sign = await $fetch<{
    supabaseUrl: string
    anonKey: string
    bucket: string
    path: string
    token: string
  }>('/api/uploads/sign', { method: 'POST', body: { filename, type } })

  const supabase = createClient(sign.supabaseUrl, sign.anonKey)
  const { error } = await supabase.storage
    .from(sign.bucket)
    .uploadToSignedUrl(sign.path, sign.token, body, { contentType: type })
  if (error) throw new Error(error.message)
  return sign.path
}

/** Compress (if an image) and upload a file; returns an upload-ready attachment record. */
export async function processFile(file: File): Promise<ProcessedAttachment> {
  const compressible = ['image/png', 'image/jpeg', 'image/webp']
  if (compressible.includes(file.type)) {
    const c = await compressImage(file)
    if (c) {
      const path = await signAndUpload(c.blob, c.name, 'image/jpeg')
      return { name: c.name, type: 'image/jpeg', size: c.blob.size, path }
    }
  }
  const type = file.type || 'application/octet-stream'
  const path = await signAndUpload(file, file.name, type)
  return { name: file.name, type, size: file.size, path }
}
