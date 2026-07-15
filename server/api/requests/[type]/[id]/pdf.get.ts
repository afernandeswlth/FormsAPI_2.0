import { createError, getRouterParam, getQuery, setHeader } from 'h3'
import { getRequestType } from '~~/server/utils/guards'
import { getRequest } from '~~/server/utils/store'
import { fillTemplate } from '~~/server/utils/pdf'
import { downloadSubmissionPdf } from '~~/server/utils/supabase'

/**
 * GET /api/requests/:type/:id/pdf
 * Returns the official WLTH PDF template filled with this submission's answers.
 *
 * In production the request is served across ephemeral serverless instances, so
 * the in-memory store often won't hold this record on the download request. We
 * therefore fall back to the durable copy saved to Supabase at submission time.
 */
export default defineEventHandler(async (event) => {
  const type = getRequestType(event)
  const id = getRouterParam(event, 'id') as string

  let bytes: Uint8Array | null = null
  let filename = ''

  // Fast path: the record is still in this instance's memory (e.g. local dev).
  const record = getRequest(id)
  if (record && record.type === type) {
    ;({ bytes, filename } = await fillTemplate(record))
  } else {
    // Durable path: the completed PDF persisted to Supabase at submission time.
    const stored = await downloadSubmissionPdf(type, id)
    if (stored) {
      bytes = stored
      const ref = (getQuery(event).ref as string | undefined)?.replace(/[^\w.-]/g, '')
      filename = `${ref || type}.pdf`
    }
  }

  if (!bytes) {
    throw createError({ statusCode: 404, statusMessage: 'Request not found' })
  }

  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `attachment; filename="${filename}"`)
  return Buffer.from(bytes)
})
