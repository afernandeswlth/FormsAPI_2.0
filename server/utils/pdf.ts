import { PDFDocument, PDFName, StandardFonts, rgb, type PDFForm } from 'pdf-lib'
import { createError } from 'h3'
import { HUB_OPTIONS, type RequestType, type ServicingRequest } from '~~/server/types/requests'

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

// ---------------------------------------------------------------------------
// Generic WLTH-branded summary PDF (fallback for forms without a template map)
// ---------------------------------------------------------------------------
const TITLE: Record<string, string> = Object.fromEntries(
  HUB_OPTIONS.map((o) => [o.type, o.title]),
)
const FREQ_LABEL: Record<string, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}
const PRODUCT_LABEL: Record<string, string> = {
  pi: 'Principal & Interest',
  io: 'Interest Only',
  fixed: 'Fixed Rate',
}
const PURPOSE_LABEL: Record<string, string> = {
  property: 'Property Purchase / Settlement',
  construction: 'Construction / Renovation',
  'third-party': 'Transfer To Third Party',
  personal: 'Transfer To My Own Account',
  other: 'Other',
}

async function generateSummaryPdf(rec: ServicingRequest): Promise<Uint8Array> {
  const d = rec.details as any
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const navy = rgb(0.122, 0.137, 0.176)
  const blue = rgb(0.078, 0.271, 0.78)
  const muted = rgb(0.357, 0.4, 0.46)
  const M = 50
  const PW = 595
  const W = PW - M * 2
  let page = pdf.addPage([PW, 842])
  let y = 800

  const newPage = () => {
    page = pdf.addPage([PW, 842])
    y = 800
  }
  const ensure = (h: number) => {
    if (y - h < 50) newPage()
  }
  const wrap = (s: string, f: typeof font, size: number, maxw: number) => {
    const out: string[] = []
    for (const para of String(s).split('\n')) {
      let cur = ''
      for (const word of para.split(/\s+/)) {
        const t = cur ? `${cur} ${word}` : word
        if (f.widthOfTextAtSize(t, size) > maxw && cur) {
          out.push(cur)
          cur = word
        } else cur = t
      }
      out.push(cur)
    }
    return out
  }
  const heading = (s: string) => {
    y -= 8
    ensure(22)
    page.drawText(s, { x: M, y, size: 12, font: bold, color: blue })
    y -= 6
    page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.75, color: rgb(0.85, 0.88, 0.92) })
    y -= 14
  }
  const row = (label: string, value: unknown) => {
    const lines = wrap(value == null || value === '' ? '—' : String(value), font, 10, W - 160)
    ensure(lines.length * 13 + 2)
    page.drawText(label, { x: M, y, size: 9.5, font: bold, color: navy })
    lines.forEach((ln, i) => {
      page.drawText(ln, { x: M + 160, y, size: 10, font, color: rgb(0.15, 0.17, 0.2) })
      if (i < lines.length - 1) y -= 13
    })
    y -= 16
  }

  // Header
  page.drawText('WLTH', { x: M, y, size: 22, font: bold, color: navy })
  y -= 28
  page.drawText(TITLE[rec.type] ?? rec.type, { x: M, y, size: 16, font: bold, color: navy })
  y -= 24
  row('Reference', rec.reference)
  row('Submitted', rec.createdAt?.slice(0, 10))
  row('Status', rec.status)

  if (Array.isArray(d.borrowers)) {
    heading('Borrowers')
    d.borrowers.forEach((b: any, i: number) => {
      const parts = [
        `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim(),
        b.customerNumber ? `Customer No. ${b.customerNumber}` : '',
        b.mobile,
        b.email,
      ].filter(Boolean)
      row(`Borrower ${i + 1}`, parts.join('  ·  '))
    })
  }

  heading('Loan')
  row('Loan Account Number', rec.loanAccountNumber)
  if (d.comments) row('Comments', d.comments)

  if (Array.isArray(d.linkedAccounts) && d.linkedAccounts.length) {
    heading('Linked Account(s)')
    d.linkedAccounts.forEach((a: any, i: number) => {
      const type = a.accountType === 'wlth' ? 'WLTH' : a.accountType === 'external' ? 'External' : ''
      const parts = [
        type,
        a.accountName,
        a.financialInstitution,
        a.branch,
        a.bsb ? `BSB ${a.bsb}` : '',
        a.accountNumber,
      ].filter(Boolean)
      row(`Account ${i + 1}`, parts.join('  ·  '))
    })
  }

  // Type-specific details
  const det: Array<[string, unknown]> = []
  if (d.repayment) {
    det.push(['Frequency', FREQ_LABEL[d.repayment.frequency] ?? d.repayment.frequency])
    det.push([
      'Repayment Amount',
      d.repayment.amountType === 'other' || d.repayment.amountType === 'fixed'
        ? money(d.repayment.amount)
        : 'Minimum',
    ])
  }
  if (d.frequency) det.push(['Frequency', FREQ_LABEL[d.frequency] ?? d.frequency])
  if (d.amountType) {
    det.push([
      'Repayment Amount',
      d.amountType === 'minimum' ? 'Minimum amount' : money(d.amount),
    ])
  } else if (d.amount != null && !d.repayment) {
    det.push(['Amount', money(d.amount)])
  }
  if (d.destination) {
    det.push([
      'Destination Account',
      [d.destination.accountName, `BSB ${d.destination.bsb}`, d.destination.accountNumber]
        .filter(Boolean)
        .join('  ·  '),
    ])
  }
  if (d.purpose) det.push(['Purpose', PURPOSE_LABEL[d.purpose] ?? d.purpose])
  if (d.productType) det.push(['Requested Product', PRODUCT_LABEL[d.productType] ?? d.productType])
  if (d.interestRate != null) det.push(['Preferred Rate', `${d.interestRate}%`])
  if (d.term) det.push(['Term', d.term])
  if (d.reason) det.push(['Reason', d.reason])
  if (det.length) {
    heading('Request Details')
    det.forEach(([l, v]) => row(l, v))
  }

  if (Array.isArray(d.attachments) && d.attachments.length) {
    heading('Attachments')
    d.attachments.forEach((a: any, i: number) => row(`Document ${i + 1}`, a.name))
  }

  heading('Declaration & Signatures')
  if (d.declaration) row('Declaration', d.declaration.agreed ? 'Accepted' : 'Not accepted')
  if (d.acknowledgement) row('Acknowledgement', d.acknowledgement.accepted ? 'Accepted' : 'Not accepted')

  // Signature images
  const sigs: any[] = Array.isArray(d.signatures) ? d.signatures : []
  for (let i = 0; i < sigs.length; i++) {
    const img = sigs[i]?.image
    const b64 = img && img.includes(',') ? img.split(',')[1] : null
    ensure(70)
    page.drawText(`Borrower ${i + 1} signature`, { x: M, y, size: 9.5, font: bold, color: navy })
    y -= 6
    if (b64) {
      try {
        const png = await pdf.embedPng(Buffer.from(b64, 'base64'))
        const w = 160
        const h = (png.height / png.width) * w
        ensure(h + 14)
        page.drawImage(png, { x: M, y: y - h, width: w, height: h })
        page.drawLine({ start: { x: M, y: y - h - 3 }, end: { x: M + 200, y: y - h - 3 }, thickness: 0.5, color: muted })
        y -= h + 14
      } catch {
        y -= 14
      }
    } else {
      y -= 14
    }
    if (sigs[i]?.signedAt) {
      page.drawText(`Signed ${String(sigs[i].signedAt).slice(0, 10)}`, { x: M, y, size: 8, font, color: muted })
      y -= 14
    }
  }

  return pdf.save()
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
  // Forms without an official-template map get a clean WLTH summary PDF instead.
  if (!filler) {
    const bytes = await generateSummaryPdf(rec)
    return { bytes, filename: `${rec.reference}.pdf` }
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
