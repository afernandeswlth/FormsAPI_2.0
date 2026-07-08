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
