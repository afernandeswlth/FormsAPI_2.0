import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase Storage integration for form uploads.
 *
 * Files are uploaded from the browser straight to Supabase (via short-lived
 * signed upload URLs), so they never pass through Vercel's ~4.5MB request-body
 * limit — allowing up to a 25MB total. The server downloads them (service role)
 * when building the combined PDF.
 *
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, [SUPABASE_BUCKET]
 */
export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'form-uploads'

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

let admin: SupabaseClient | null = null

/** Service-role client (server only — full storage access; never expose). */
export function supabaseAdmin(): SupabaseClient {
  if (!admin) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
    }
    admin = createClient(url, key, { auth: { persistSession: false } })
  }
  return admin
}

/** Download a stored file's bytes by its bucket path (null if missing/error). */
export async function downloadAttachment(path: string): Promise<Buffer | null> {
  if (!path || !supabaseConfigured()) return null
  const { data, error } = await supabaseAdmin().storage.from(SUPABASE_BUCKET).download(path)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

/** Bucket path for a submission's completed PDF. */
function submissionPath(type: string, id: string): string {
  return `submissions/${type}/${id}.pdf`
}

/**
 * Persist a submission's completed PDF so it can be downloaded later.
 *
 * The in-memory request store does not survive across serverless invocations,
 * so the "Download Submission Copy" link would otherwise 404 in production.
 * Storing the PDF in Supabase makes it durable. Returns false (never throws) if
 * Supabase is not configured or the upload fails.
 */
export async function uploadSubmissionPdf(
  type: string,
  id: string,
  bytes: Uint8Array,
): Promise<boolean> {
  if (!supabaseConfigured()) return false
  const { error } = await supabaseAdmin()
    .storage.from(SUPABASE_BUCKET)
    .upload(submissionPath(type, id), Buffer.from(bytes), {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (error) {
    console.error('[supabase] submission PDF upload failed:', error)
    return false
  }
  return true
}

/** Download a previously stored submission PDF (null if missing/error). */
export async function downloadSubmissionPdf(type: string, id: string): Promise<Buffer | null> {
  return downloadAttachment(submissionPath(type, id))
}
