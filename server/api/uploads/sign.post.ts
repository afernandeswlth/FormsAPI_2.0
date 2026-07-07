import { createError, readBody } from 'h3'
import { randomUUID } from 'node:crypto'
import { SUPABASE_BUCKET, supabaseAdmin, supabaseConfigured } from '~~/server/utils/supabase'

/**
 * POST /api/uploads/sign  { filename, type }
 * Returns a short-lived signed upload URL so the browser can upload a file
 * directly to Supabase Storage (bypassing Vercel's request-body limit).
 */
export default defineEventHandler(async (event) => {
  if (!supabaseConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'File uploads are not configured' })
  }
  const body = (await readBody(event)) as { filename?: string; type?: string }
  const safeName = (body.filename || 'file').replace(/[^\w.\-]+/g, '_').slice(-80)
  const year = new Date().getFullYear()
  const path = `${year}/${randomUUID()}-${safeName}`

  const { data, error } = await supabaseAdmin()
    .storage.from(SUPABASE_BUCKET)
    .createSignedUploadUrl(path)
  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: `Could not create upload URL: ${error?.message}` })
  }

  return {
    supabaseUrl: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    bucket: SUPABASE_BUCKET,
    path: data.path,
    token: data.token,
  }
})
