import { Resend } from 'resend'
import { HUB_OPTIONS, type ServicingRequest } from '~~/server/types/requests'

/**
 * Emails the filled PDF for a submitted request to the WLTH servicing inbox.
 *
 * Uses Resend (HTTP API — reliable on Vercel serverless, unlike SMTP).
 * Configuration via environment variables:
 *   RESEND_API_KEY  (required)  — from https://resend.com/api-keys
 *   MAIL_FROM       (optional)  — verified sender, e.g. "WLTH <forms@wlth.com>".
 *                                 Defaults to Resend's shared onboarding sender.
 *   MAIL_TO         (optional)  — recipient(s), comma-separated.
 *                                 Defaults to a.fernandes@wlth.com.
 *
 * Never throws in a way that breaks submission — the caller wraps it, and a
 * missing API key simply logs and skips so local/dev still works.
 */
export async function emailRequestPdf(
  rec: ServicingRequest,
  pdfBytes: Uint8Array,
  filename: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn(`[mail] RESEND_API_KEY not set — skipping email for ${rec.reference}`)
    return
  }

  const from = process.env.MAIL_FROM || 'WLTH Client Hub <onboarding@resend.dev>'
  const to = (process.env.MAIL_TO || 'a.fernandes@wlth.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const title = HUB_OPTIONS.find((o) => o.type === rec.type)?.title ?? rec.type
  const name = `${rec.customer.firstName} ${rec.customer.lastName}`.trim()

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1f232d;line-height:1.55">
      <h2 style="margin:0 0 12px">New ${title}</h2>
      <p style="margin:0 0 16px">A new request has been submitted through the WLTH Client Hub. The completed form is attached as a PDF.</p>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 16px 4px 0;color:#4c5a68">Reference</td><td style="padding:4px 0"><strong>${rec.reference}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#4c5a68">Form</td><td style="padding:4px 0">${title}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#4c5a68">Customer</td><td style="padding:4px 0">${name}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#4c5a68">Email</td><td style="padding:4px 0">${rec.customer.email}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#4c5a68">Loan account</td><td style="padding:4px 0">${rec.loanAccountNumber}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#4c5a68">Submitted</td><td style="padding:4px 0">${rec.createdAt}</td></tr>
      </table>
    </div>`

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `New ${title} — ${rec.reference}`,
    html,
    attachments: [{ filename, content: Buffer.from(pdfBytes).toString('base64') }],
  })
  if (error) {
    throw new Error(`Resend error: ${error.name} — ${error.message}`)
  }
  console.log(`[mail] sent ${rec.reference} (${filename}) to ${to.join(', ')}`)
}
