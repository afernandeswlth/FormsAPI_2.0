import { SUPABASE_BUCKET, supabaseAdmin, supabaseConfigured } from '~~/server/utils/supabase'

/**
 * TEMPORARY diagnostic — GET /api/_debug/supabase
 * Confirms the Supabase env is live and the bucket is reachable. Remove once
 * uploads are confirmed working.
 */
export default defineEventHandler(async () => {
  const out: Record<string, unknown> = {
    configured: supabaseConfigured(),
    bucket: SUPABASE_BUCKET,
    urlPresent: Boolean(process.env.SUPABASE_URL),
    anonKeyPresent: Boolean(process.env.SUPABASE_ANON_KEY),
    serviceKeyPresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  }
  if (!out.configured) return out
  try {
    const { error } = await supabaseAdmin()
      .storage.from(SUPABASE_BUCKET)
      .createSignedUploadUrl(`_healthcheck/${new Date().toISOString().slice(0, 10)}.txt`)
    out.bucketReachable = !error
    out.detail = error ? `${error.message}` : 'signed upload URL created OK'
  } catch (e) {
    out.bucketReachable = false
    out.detail = `exception: ${(e as Error).message}`
  }
  return out
})
