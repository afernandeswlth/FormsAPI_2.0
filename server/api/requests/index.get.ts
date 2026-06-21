import { getQuery } from 'h3'
import { REQUEST_TYPES, type RequestType } from '~~/server/types/requests'
import { listRequests } from '~~/server/utils/store'

/**
 * GET /api/requests
 * List requests across all types. Optional ?status= filter.
 */
export default defineEventHandler((event) => {
  const { status } = getQuery(event)
  let data = listRequests()
  if (typeof status === 'string') {
    data = data.filter((r) => r.status === status)
  }
  const byType = Object.fromEntries(
    REQUEST_TYPES.map((t) => [t, data.filter((r) => r.type === t).length]),
  ) as Record<RequestType, number>

  return { count: data.length, byType, data }
})
