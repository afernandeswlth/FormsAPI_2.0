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
  setResponseStatus(event, 201)
  return record
})
