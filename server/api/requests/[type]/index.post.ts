import {
  createError,
  getRequestHeader,
  getRequestIP,
  readBody,
  setResponseStatus,
} from 'h3'
import { getRequestType } from '~~/server/utils/guards'
import { bodySchemas } from '~~/server/utils/validation'
import { createRequest } from '~~/server/utils/store'
import { fillTemplate } from '~~/server/utils/pdf'
import { emailRequestPdf } from '~~/server/utils/mail'
import { uploadSubmissionPdf } from '~~/server/utils/supabase'

/**
 * POST /api/requests/:type
 * Submit a new servicing request of the given type.
 */
export default defineEventHandler(async (event) => {
  const type = getRequestType(event)
  const body = await readBody(event)

  const parsed = bodySchemas[type].safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: { errors: parsed.error.flatten() },
    })
  }

  // Server-captured audit metadata (authoritative IP, not client-supplied).
  const serverAudit = {
    ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
    userAgent: getRequestHeader(event, 'user-agent') ?? null,
    receivedAt: new Date().toISOString(),
  }

  const record = createRequest(type, {
    ...(parsed.data as Record<string, unknown>),
    serverAudit,
  } as never)

  // Generate the completed PDF and email it to the servicing inbox. Awaited so
  // it finishes before the serverless function ends, but never blocks or fails
  // the submission — any error is logged and the client still gets its reference.
  try {
    const { bytes, filename } = await fillTemplate(record)
    // Persist the PDF so the "Download Submission Copy" link works later, even
    // though the in-memory store does not survive across serverless invocations.
    await uploadSubmissionPdf(type, record.id, bytes)
    await emailRequestPdf(record, bytes, filename)
  } catch (err) {
    console.error(`[mail] failed to email request ${record.reference}:`, err)
  }

  setResponseStatus(event, 201)
  return record
})
