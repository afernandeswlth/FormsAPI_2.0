import { PDFDocument, PDFName, type PDFForm } from 'pdf-lib'
import { createError } from 'h3'
import type { RequestType, ServicingRequest } from '~~/server/types/requests'

/**
 * Fills the official WLTH PDF template for a submitted request, returning the
 * completed PDF bytes. Templates live in server/assets/templates/<type>.pdf and
 * are bundled via nitro.serverAssets (see nuxt.config).
 *
 * Field names in the templates are mostly generic ("Enter Text7"), so each
 * filler maps them by the verified on-page position for that form.
 */

// 1x1 transparent PNG — fallback if a signature image is somehow missing.
const FALLBACK_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC'

function setText(form: PDFForm, name: string, value: unknown) {
  try {
    const f = form.getTextField(name)
    f.setText(value == null ? '' : String(value))
    f.setFontSize(9)
  } catch {
    /* field absent on this template — ignore */
  }
}
function check(form: PDFForm, name: string) {
  try {
    form.getCheckBox(name).check()
  } catch {
    /* ignore */
  }
}
function money(n: unknown) {
  const v = Number(n)
  return Number.isFinite(v)
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(v)
    : ''
}
function isoDate(s?: string) {
  return s ? s.slice(0, 10) : ''
}

/** Draw each borrower's signature PNG over the given signature widgets. */
async function drawSignatures(
  pdf: PDFDocument,
  form: PDFForm,
  fieldNames: string[],
  signatures: Array<{ image?: string }> = [],
  fallbackPageIndex = 0,
) {
  const pages = pdf.getPages()
  for (let i = 0; i < fieldNames.length; i++) {
    const dataUrl = signatures[i]?.image
    const b64 = dataUrl && dataUrl.includes(',') ? dataUrl.split(',')[1]! : null
    if (!b64) continue
    try {
      const png = await pdf.embedPng(Buffer.from(b64, 'base64'))
      const field = form.getField(fieldNames[i]!)
      const widget = field.acroField.getWidgets()[0]!
      const pRef = widget.dict.get(PDFName.of('P'))
      const pi = pages.findIndex((p) => p.ref === pRef)
      const page = pages[pi < 0 ? fallbackPageIndex : pi]!
      const r = widget.getRectangle()
      // Fit the signature within the widget box, preserving aspect.
      const maxW = Math.min(r.width, 150)
      const maxH = Math.min(r.height || 34, 36)
      const scale = Math.min(maxW / png.width, maxH / png.height)
      const w = png.width * scale
      const h = png.height * scale
      page.drawImage(png, { x: r.x + 2, y: r.y + 2, width: w, height: h })
    } catch {
      /* ignore a single bad signature */
    }
  }
}

// ---------------------------------------------------------------------------
// Direct Debit Request
// ---------------------------------------------------------------------------
const FREQ_INDEX: Record<string, number> = { weekly: 0, fortnightly: 1, monthly: 2 }

async function fillDirectDebit(pdf: PDFDocument, form: PDFForm, rec: ServicingRequest) {
  const d = rec.details as any
  const borrowers: any[] = d.borrowers ?? []
  const accounts: any[] = d.linkedAccounts ?? []
  const freqIdx = FREQ_INDEX[d.repayment?.frequency]
  const isOther = d.repayment?.amountType === 'other'
  const amountText = isOther ? money(d.repayment?.amount) : 'Minimum Required'

  if (accounts.length <= 1) {
    // ---- PAGE 1: single linked account ----
    setText(form, 'Text29', rec.loanAccountNumber)
    setText(form, 'Text30', borrowers[0]?.lastName)
    setText(form, 'Text31', borrowers[0]?.firstName)
    setText(form, 'Text32', borrowers[1]?.lastName)
    setText(form, 'Text33', borrowers[1]?.firstName)
    const a = accounts[0] ?? {}
    setText(form, 'Text35', a.financialInstitution)
    setText(form, 'Text36', a.branch)
    setText(form, 'Text37', a.accountName)
    setText(form, 'BSB No_5', a.bsb)
    setText(form, 'ACCOUNT No_5', a.accountNumber)
    const p1freq = ['Check Box13', 'Check Box14', 'Check Box15']
    if (freqIdx != null) check(form, p1freq[freqIdx]!)
    if (isOther) setText(form, 'Single DD  $ amount', money(d.repayment?.amount))
    else check(form, 'Check Box16')
    setText(form, 'Comments', d.comments)
    setText(form, 'Enter Text30', borrowers[0]?.mobile)
    setText(form, 'Enter Text29', borrowers[1]?.mobile)
    setText(form, 'Enter Text32', isoDate(d.signatures?.[0]?.signedAt))
    setText(form, 'Enter Text34', isoDate(d.signatures?.[1]?.signedAt))
    await drawSignatures(pdf, form, ['Signature3', 'Signature4'], d.signatures, 0)
  } else {
    // ---- PAGE 2: multiple linked accounts (1–4) ----
    setText(form, 'Enter Text1', rec.loanAccountNumber)
    setText(form, 'Enter Text2', borrowers[0]?.lastName)
    setText(form, 'Enter Text3', borrowers[0]?.firstName)
    setText(form, 'Enter Text4', borrowers[1]?.lastName)
    setText(form, 'Enter Text5', borrowers[1]?.firstName)
    const fi = ['Enter Text7', 'Enter Text11', 'Enter Text15', 'Enter Text19']
    const br = ['Enter Text8', 'Enter Text12', 'Enter Text16', 'Enter Text20']
    const nm = ['Enter Text9', 'Enter Text13', 'Enter Text17', 'Enter Text21']
    const bsb = ['BSB No', 'BSB No_2', 'BSB No_3', 'BSB No_4']
    const acc = ['ACCOUNT No', 'ACCOUNT No_2', 'ACCOUNT No_3', 'ACCOUNT No_4']
    // NB: the template names accounts 3 & 4 amount fields identically
    // ("Frequency 4  $ amount") — both receive the same value, which is fine
    // because this form uses one frequency/amount for the whole request.
    const amt = [
      'Frequency 1  $ amount',
      'Frequency 2  $ amount',
      'Frequency 4  $ amount',
      'Frequency 4  $ amount',
    ]
    const freqGroups = [
      ['Check Box1', 'Check Box2', 'Check Box3'],
      ['Check Box4', 'Check Box5', 'Check Box6'],
      ['Check Box7', 'Check Box8', 'Check Box9'],
      ['Check Box10', 'Check Box11', 'Check Box12'],
    ]
    accounts.slice(0, 4).forEach((a, i) => {
      setText(form, fi[i]!, a.financialInstitution)
      setText(form, br[i]!, a.branch)
      setText(form, nm[i]!, a.accountName)
      setText(form, bsb[i]!, a.bsb)
      setText(form, acc[i]!, a.accountNumber)
      setText(form, amt[i]!, amountText)
      if (freqIdx != null) check(form, freqGroups[i]![freqIdx]!)
    })
    setText(form, 'Enter Text23', borrowers[0]?.mobile)
    setText(form, 'Enter Text26', borrowers[1]?.mobile)
    setText(form, 'Enter Text25', isoDate(d.signatures?.[0]?.signedAt))
    setText(form, 'Enter Text28', isoDate(d.signatures?.[1]?.signedAt))
    await drawSignatures(pdf, form, ['Signature1', 'Signature2'], d.signatures, 1)
  }
}

// Registry of per-type fillers. Add the remaining forms here as they're mapped.
const FILLERS: Partial<
  Record<RequestType, (pdf: PDFDocument, form: PDFForm, rec: ServicingRequest) => Promise<void> | void>
> = {
  'direct-debit': fillDirectDebit,
}

export function hasPdfTemplate(type: RequestType) {
  return type in FILLERS
}

export async function fillTemplate(
  rec: ServicingRequest,
): Promise<{ bytes: Uint8Array; filename: string }> {
  const filler = FILLERS[rec.type]
  if (!filler) {
    throw createError({
      statusCode: 501,
      statusMessage: `A completed PDF is not yet available for ${rec.type}`,
    })
  }
  const candidates: Array<[string, string]> = [
    ['assets:templates', `${rec.type}.pdf`],
    ['assets:server', `templates/${rec.type}.pdf`],
    ['assets:server', `templates:${rec.type}.pdf`],
  ]
  let raw: Uint8Array | null = null
  for (const [base, key] of candidates) {
    raw = (await useStorage(base).getItemRaw(key).catch(() => null)) as Uint8Array | null
    if (raw) break
  }
  if (!raw) {
    throw createError({ statusCode: 500, statusMessage: `Template missing for ${rec.type}` })
  }
  const pdf = await PDFDocument.load(raw, { ignoreEncryption: true })
  const form = pdf.getForm()
  await filler(pdf, form, rec)
  try {
    form.flatten()
  } catch {
    /* some templates have signature fields that resist flatten; ignore */
  }
  const bytes = await pdf.save()
  return { bytes, filename: `${rec.reference}.pdf` }
}
