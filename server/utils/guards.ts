import { createError, getRouterParam, type H3Event } from 'h3'
import { REQUEST_TYPES, type RequestType } from '~~/server/types/requests'

/** Read + validate the `:type` route param against the known request types. */
export function getRequestType(event: H3Event): RequestType {
  const type = getRouterParam(event, 'type')
  if (!type || !REQUEST_TYPES.includes(type as RequestType)) {
    throw createError({
      statusCode: 404,
      statusMessage: `Unknown request type: ${type}`,
      data: { validTypes: REQUEST_TYPES },
    })
  }
  return type as RequestType
}
