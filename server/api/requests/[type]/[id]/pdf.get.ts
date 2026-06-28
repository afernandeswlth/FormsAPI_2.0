import { createError, getRouterParam, setHeader } from 'h3'
import { getRequestType } from '~~/server/utils/guards'
import { getRequest } from '~~/server/utils/store'
import { fillTemplate } from '~~/server/utils/pdf'

/**
 * GET /api/requests/:type/:id/pdf
 * Returns the official WLTH PDF template filled with this submission's answers.
 */
export default defineEventHandler(async (event) => {
  const type = getRequestType(event)
  const id = getRouterParam(event, 'id') as string

  const record = getRequest(id)
  if (!record || record.type !== type) {
    throw createError({ statusCode: 404, statusMessage: 'Request not found' })
  }

  const { bytes, filename } = await fillTemplate(record)
  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `attachment; filename="${filename}"`)
  return Buffer.from(bytes)
})
