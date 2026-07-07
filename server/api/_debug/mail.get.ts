import { Resend } from 'resend'

/**
 * TEMPORARY diagnostic — GET /api/_debug/mail
 * Reports whether the Resend key is live on this deployment and attempts a test
 * send, returning the exact Resend result/error. Remove once email is working.
 */
export default defineEventHandler(async () => {
  const key = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM || 'WLTH Client Hub <onboarding@resend.dev>'
  const to = (process.env.MAIL_TO || 'a.fernandes@wlth.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!key) {
    return {
      resendKeyPresent: false,
      from,
      to,
      note: 'RESEND_API_KEY is NOT set on this deployment. Add it in Vercel (Production) and redeploy.',
    }
  }

  const resend = new Resend(key)
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: 'WLTH Client Hub — test email',
    html: '<p>Test email from the WLTH Client Hub diagnostic. If this arrives, submitted-form PDFs will arrive here too.</p>',
  })

  return {
    resendKeyPresent: true,
    keyPrefix: key.slice(0, 5) + '…',
    from,
    to,
    sent: !error,
    resendId: data?.id ?? null,
    error: error ? `${error.name}: ${error.message}` : null,
  }
})
