import { getQuery } from 'h3'
import { fillTemplate } from '~~/server/utils/pdf'
import { emailRequestPdf } from '~~/server/utils/mail'
import type { ServicingRequest } from '~~/server/types/requests'

/**
 * TEMPORARY diagnostic — GET /api/_debug/submit-email?type=open-offset
 * Runs the EXACT real submission path (fillTemplate -> emailRequestPdf) against a
 * dummy record and reports which step fails. Remove once emails are confirmed.
 */
export default defineEventHandler(async (event) => {
  const type = ((getQuery(event).type as string) || 'open-offset') as ServicingRequest['type']
  const now = new Date().toISOString()

  const rec = {
    id: 'debug',
    type,
    reference: 'DEBUG-TEST',
    status: 'submitted',
    customer: {
      firstName: 'Debug',
      lastName: 'Test',
      email: 'debug@example.com',
      phone: '0400000000',
    },
    loanAccountNumber: '400000',
    details: {
      borrowers: [
        { firstName: 'Debug', lastName: 'Test', mobile: '0400000000', email: 'debug@example.com', customerNumber: 'C1' },
      ],
      feePayment: 'redraw',
      signatures: [],
    },
    createdAt: now,
    updatedAt: now,
  } as unknown as ServicingRequest

  const out: Record<string, unknown> = { type, resendKeyPresent: !!process.env.RESEND_API_KEY }

  let bytes: Uint8Array
  let filename: string
  try {
    const r = await fillTemplate(rec)
    bytes = r.bytes
    filename = r.filename
    out.fillTemplate = { ok: true, bytes: bytes.length, filename }
  } catch (e: unknown) {
    const err = e as { statusMessage?: string; name?: string; message?: string }
    out.fillTemplate = { ok: false, error: err.statusMessage || err.message || String(e) }
    return out
  }

  try {
    await emailRequestPdf(rec, bytes, filename)
    out.email = { attempted: true, ok: true }
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string }
    out.email = { attempted: true, ok: false, error: `${err.name || ''}: ${err.message || String(e)}` }
  }
  return out
})
