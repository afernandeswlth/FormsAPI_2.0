import { getRequestType } from '~~/server/utils/guards'
import { listRequests } from '~~/server/utils/store'

/**
 * GET /api/requests/:type
 * List all submitted requests of the given type (newest first).
 */
export default defineEventHandler((event) => {
  const type = getRequestType(event)
  const data = listRequests(type)
  return { type, count: data.length, data }
})
