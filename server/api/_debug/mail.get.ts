import { Resend } from 'resend'
import { PDFDocument, StandardFonts } from 'pdf-lib'

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

  // Build a tiny PDF so this test also verifies attachment delivery.
  const doc = await PDFDocument.create()
  const page = doc.addPage([320, 160])
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  page.drawText('WLTH Client Hub', { x: 24, y: 100, size: 18, font })
  page.drawText('Test attachment — email is working.', { x: 24, y: 74, size: 11 })
  const pdfBytes = await doc.save()

  const resend = new Resend(key)
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: 'WLTH Client Hub — test email (with PDF)',
    html: '<p>Test email from the WLTH Client Hub diagnostic, with a sample PDF attached. If the attachment is here, submitted-form PDFs will arrive too.</p>',
    attachments: [{ filename: 'wlth-test.pdf', content: Buffer.from(pdfBytes) }],
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
