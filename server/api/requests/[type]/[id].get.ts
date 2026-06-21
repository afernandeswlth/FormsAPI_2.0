import { createError, getRouterParam } from 'h3'
import { getRequestType } from '~~/server/utils/guards'
import { getRequest } from '~~/server/utils/store'

/**
 * GET /api/requests/:type/:id
 * Fetch a single request by id (scoped to the type in the path).
 */
export default defineEventHandler((event) => {
  const type = getRequestType(event)
  const id = getRouterParam(event, 'id') as string

  const record = getRequest(id)
  if (!record || record.type !== type) {
    throw createError({ statusCode: 404, statusMessage: 'Request not found' })
  }
  return record
})
