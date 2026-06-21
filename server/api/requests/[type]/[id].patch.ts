import { createError, getRouterParam, readBody } from 'h3'
import { getRequestType } from '~~/server/utils/guards'
import { statusUpdateSchema } from '~~/server/utils/validation'
import { getRequest, updateStatus } from '~~/server/utils/store'

/**
 * PATCH /api/requests/:type/:id
 * Advance a request through its lifecycle (status transition).
 */
export default defineEventHandler(async (event) => {
  const type = getRequestType(event)
  const id = getRouterParam(event, 'id') as string

  const existing = getRequest(id)
  if (!existing || existing.type !== type) {
    throw createError({ statusCode: 404, statusMessage: 'Request not found' })
  }

  const parsed = statusUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: { errors: parsed.error.flatten() },
    })
  }

  return updateStatus(id, parsed.data.status)
})
