import { createError, readBody, setResponseStatus } from 'h3'
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

  const record = createRequest(type, parsed.data as never)
  setResponseStatus(event, 201)
  return record
})
