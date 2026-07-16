import { PDFDocument, PDFName, StandardFonts, rgb, type PDFForm } from 'pdf-lib'
import { createError } from 'h3'
import { HUB_OPTIONS, type RequestType, type ServicingRequest } from '~~/server/types/requests'
import { downloadAttachment } from '~~/server/utils/supabase'

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

/**
 * Strip characters the PDF standard fonts can't encode (anything outside ASCII,
 * e.g. Japanese) so PDF generation never throws. The client blocks such input
 * with a clear message; this is a server-side safety net for API-direct calls.
 */
function ascii(value: unknown): string {
  return value == null ? '' : String(value).replace(/[^\x00-\x7F]/g, '')
}

function setText(form: PDFForm, name: string, value: unknown) {
  try {
    const f = form.getTextField(name)
    f.setText(ascii(value))
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

type Rect = { x: number; y: number; width: number; height: number }
type Geom = { page: any; r: Rect } | null

/** Locate a field's first widget — its page and rectangle. */
function fieldGeom(form: PDFForm, pages: any[], name: string): Geom {
  try {
    const w = form.getField(name).acroField.getWidgets()[0]!
    const pRef = w.dict.get(PDFName.of('P'))
    const pi = pages.findIndex((p) => p.ref === pRef)
    return { page: pages[pi < 0 ? 0 : pi]!, r: w.getRectangle() }
  } catch {
    return null
  }
}
/** Decode a data-URL PNG into an embedded image (null if missing/bad). */
async function embedSig(pdf: PDFDocument, dataUrl?: string) {
  const b64 = dataUrl && dataUrl.includes(',') ? dataUrl.split(',')[1]! : null
  if (!b64) return null
  try {
    return await pdf.embedPng(Buffer.from(b64, 'base64'))
  } catch {
    return null
  }
}
/** Draw an "X" centred in a checkbox-sized rectangle. */
function drawXMark(page: any, r: Rect, font: any) {
  const box = Math.min(r.width, r.height)
  const size = box * 1.15
  const tw = font.widthOfTextAtSize('X', size)
  page.drawText('X', {
    x: r.x + (r.width - tw) / 2,
    y: r.y + (r.height - size) / 2 + size * 0.12,
    size,
    font,
    color: rgb(0.12, 0.14, 0.18),
  })
}
/** Draw a signature image fitted into a box (defaults sized for a field). */
function drawSigImage(
  page: any,
  png: any,
  box: Rect,
  opts: { maxW?: number; maxH?: number; dx?: number; dy?: number } = {},
) {
  const maxW = opts.maxW ?? Math.min(box.width, 150)
  const maxH = opts.maxH ?? Math.min(box.height || 34, 36)
  const sc = Math.min(maxW / png.width, maxH / png.height)
  page.drawImage(png, {
    x: box.x + (opts.dx ?? 2),
    y: box.y + (opts.dy ?? 2),
    width: png.width * sc,
    height: png.height * sc,
  })
}

// ---------------------------------------------------------------------------
// Direct Debit Request
// ---------------------------------------------------------------------------
const FREQ_INDEX: Record<string, number> = { weekly: 0, fortnightly: 1, monthly: 2 }

// A WLTH offset account rendered as a linked account: WLTH offset account
// numbers starting 200/400 use BSB 636-380 and "WLTH" as the institution.
function offsetAsAccount(num: unknown) {
  const n = String(num ?? '').replace(/\D/g, '')
  const isWlth = n.startsWith('200') || n.startsWith('400')
  return {
    financialInstitution: 'WLTH',
    branch: '',
    accountName: '',
    bsb: isWlth ? '636380' : '', // segmented BSB field renders digits without the dash
    accountNumber: n,
  }
}

// The accounts to render: the single derived offset account, or the entered ones.
function ddAccounts(d: any): any[] {
  return d.debitSource === 'offset' ? [offsetAsAccount(d.offsetAccountNumber)] : (d.linkedAccounts ?? [])
}

// Fill ONE Direct Debit account page (single- or multi-account layout) for the
// borrower pair starting at `startIdx`, then keep [account page, terms]. Shared
// loan/account/frequency/amount data repeats on every page; only the borrower
// names, signatures, dates and contacts change.
async function fillDirectDebitPage(
  pdf: PDFDocument,
  form: PDFForm,
  rec: ServicingRequest,
  startIdx: number,
) {
  const d = rec.details as any
  const borrowers: any[] = d.borrowers ?? []
  const b1 = borrowers[startIdx]
  const b2 = borrowers[startIdx + 1]
  const sig1 = d.signatures?.[startIdx]
  const sig2 = d.signatures?.[startIdx + 1]
  const accounts: any[] = ddAccounts(d)
  const freqIdx = FREQ_INDEX[d.repayment?.frequency]
  const isOther = d.repayment?.amountType === 'other'
  const amountText = isOther ? money(d.repayment?.amount) : 'Minimum Required'
  const single = accounts.length <= 1

  const pages = pdf.getPages()
  const markFont = await pdf.embedFont(StandardFonts.HelveticaBold)

  // Overlays (an "X" on chosen boxes + signature images) are collected here and
  // drawn AFTER flatten so they sit on top of the baked field appearances.
  type Overlay =
    | { kind: 'x'; page: any; r: { x: number; y: number; width: number; height: number } }
    | { kind: 'img'; page: any; r: { x: number; y: number; width: number; height: number }; png: any }
  const overlays: Overlay[] = []
  const geom = (name: string) => {
    try {
      const w = form.getField(name).acroField.getWidgets()[0]!
      const pRef = w.dict.get(PDFName.of('P'))
      const pi = pages.findIndex((p) => p.ref === pRef)
      return { page: pages[pi < 0 ? (single ? 0 : 1) : pi]!, r: w.getRectangle() }
    } catch {
      return null
    }
  }
  const markX = (name?: string) => {
    if (!name) return
    const g = geom(name)
    if (g) overlays.push({ kind: 'x', ...g })
  }
  const markSig = async (name: string, dataUrl?: string) => {
    const b64 = dataUrl && dataUrl.includes(',') ? dataUrl.split(',')[1]! : null
    if (!b64) return
    const g = geom(name)
    if (!g) return
    try {
      const png = await pdf.embedPng(Buffer.from(b64, 'base64'))
      overlays.push({ kind: 'img', ...g, png })
    } catch {
      /* ignore a bad signature image */
    }
  }

  if (single) {
    // ---- PAGE 1: single linked account ----
    setText(form, 'Text29', rec.loanAccountNumber)
    setText(form, 'Text30', b1?.lastName)
    setText(form, 'Text31', b1?.firstName)
    setText(form, 'Text32', b2?.lastName)
    setText(form, 'Text33', b2?.firstName)
    const a = accounts[0] ?? {}
    setText(form, 'Text35', a.financialInstitution)
    setText(form, 'Text36', a.branch)
    setText(form, 'Text37', a.accountName)
    setText(form, 'BSB No_5', a.bsb)
    setText(form, 'ACCOUNT No_5', a.accountNumber)
    if (freqIdx != null) markX(['Check Box13', 'Check Box14', 'Check Box15'][freqIdx])
    if (isOther) setText(form, 'Single DD  $ amount', money(d.repayment?.amount))
    else markX('Check Box16') // Minimum Required
    setText(form, 'Comments', d.comments)
    setText(form, 'Enter Text30', b1?.mobile)
    setText(form, 'Enter Text29', b2?.mobile)
    setText(form, 'Enter Text32', isoDate(sig1?.signedAt))
    setText(form, 'Enter Text34', isoDate(sig2?.signedAt))
    await markSig('Signature3', sig1?.image)
    await markSig('Signature4', sig2?.image)
  } else {
    // ---- PAGE 2: multiple linked accounts (1–4 slots on the one page) ----
    setText(form, 'Enter Text1', rec.loanAccountNumber)
    setText(form, 'Enter Text2', b1?.lastName)
    setText(form, 'Enter Text3', b1?.firstName)
    setText(form, 'Enter Text4', b2?.lastName)
    setText(form, 'Enter Text5', b2?.firstName)
    const fi = ['Enter Text7', 'Enter Text11', 'Enter Text15', 'Enter Text19']
    const br = ['Enter Text8', 'Enter Text12', 'Enter Text16', 'Enter Text20']
    const nm = ['Enter Text9', 'Enter Text13', 'Enter Text17', 'Enter Text21']
    const bsb = ['BSB No', 'BSB No_2', 'BSB No_3', 'BSB No_4']
    const acc = ['ACCOUNT No', 'ACCOUNT No_2', 'ACCOUNT No_3', 'ACCOUNT No_4']
    // The template names accounts 3 & 4 amount fields identically
    // ("Frequency 4  $ amount") — both receive the same value, fine here.
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
      if (freqIdx != null) markX(freqGroups[i]![freqIdx])
    })
    setText(form, 'Enter Text23', b1?.mobile)
    setText(form, 'Enter Text26', b2?.mobile)
    setText(form, 'Enter Text25', isoDate(sig1?.signedAt))
    setText(form, 'Enter Text28', isoDate(sig2?.signedAt))
    await markSig('Signature1', sig1?.image)
    await markSig('Signature2', sig2?.image)
  }

  // Flatten the form fields, then draw the overlays on top.
  try {
    form.flatten()
  } catch {
    /* signature fields can resist flatten; ignore */
  }
  for (const o of overlays) {
    if (o.kind === 'x') {
      const box = Math.min(o.r.width, o.r.height)
      const size = box * 1.15
      const tw = markFont.widthOfTextAtSize('X', size)
      o.page.drawText('X', {
        x: o.r.x + (o.r.width - tw) / 2,
        y: o.r.y + (o.r.height - size) / 2 + size * 0.12,
        size,
        font: markFont,
        color: rgb(0.12, 0.14, 0.18),
      })
    } else {
      const maxW = Math.min(o.r.width, 150)
      const maxH = Math.min(o.r.height || 34, 36)
      const sc = Math.min(maxW / o.png.width, maxH / o.png.height)
      o.page.drawImage(o.png, {
        x: o.r.x + 2,
        y: o.r.y + 2,
        width: o.png.width * sc,
        height: o.png.height * sc,
      })
    }
  }

  // (Page selection is handled by the wrapper.)
}

// The Direct Debit template only has two borrower signature slots per page. For
// 3–4 borrowers, duplicate the account page (same loan account, linked accounts,
// frequency and amount) and put borrowers 3 & 4 on it, inserted before the
// terms page → [account (b1,b2), account (b3,b4), terms].
//
// Template page order is [single-account, multi-account, terms]. The account
// page used is index 0 (single, ≤1 account) or 1 (multi, 2–4 accounts).
async function fillDirectDebit(
  pdf: PDFDocument,
  form: PDFForm,
  rec: ServicingRequest,
  raw?: Uint8Array,
) {
  const d = rec.details as any
  const b: any[] = d.borrowers ?? []
  const single = ddAccounts(d).length <= 1
  const accIdx = single ? 0 : 1

  await fillDirectDebitPage(pdf, form, rec, 0)

  let extra: any = null
  if (b.length > 2 && raw) {
    const pdf2 = await PDFDocument.load(raw, { ignoreEncryption: true })
    await fillDirectDebitPage(pdf2, pdf2.getForm(), rec, 2)
    ;[extra] = await pdf.copyPages(pdf2, [accIdx]) // the account page for b3/b4
  }

  // Drop the unused layout page → [account (b1,b2), terms]; then insert b3/b4.
  pdf.removePage(single ? 1 : 0)
  if (extra) pdf.insertPage(1, extra)
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

const fullName = (b: any) => (b ? ascii(`${b.firstName ?? ''} ${b.lastName ?? ''}`.trim()) : '')

// ---------------------------------------------------------------------------
// Linked Account Nomination (same template structure as Direct Debit)
// ---------------------------------------------------------------------------
// Fill ONE Linked Account page for the borrower pair starting at `startIdx`
// (borrowers startIdx and startIdx+1). Loan + linked-account details are the
// same on every page; only the two borrower names, signatures and dates differ.
async function fillLinkedAccountPage(
  pdf: PDFDocument,
  form: PDFForm,
  rec: ServicingRequest,
  startIdx: number,
) {
  const d = rec.details as any
  const b: any[] = d.borrowers ?? []
  const accts: any[] = d.linkedAccounts ?? []
  const sg: any[] = d.signatures ?? []
  const single = accts.length <= 1
  // Top "Account No(s)" = whatever the client picked to link to: their offset
  // account number, or the loan account number.
  const primaryAcct = accts[0] ?? {}
  const topAccountNo =
    primaryAcct.linkTo === 'offset'
      ? String(primaryAcct.offsetAccountNumber ?? '').replace(/\D/g, '')
      : rec.loanAccountNumber
  const pages = pdf.getPages()
  const b1 = b[startIdx]
  const b2 = b[startIdx + 1]
  const sigs: Array<{ g: NonNullable<Geom>; png: any }> = []
  const addSig = async (name: string, img?: string) => {
    const png = await embedSig(pdf, img)
    const g = fieldGeom(form, pages, name)
    if (png && g) sigs.push({ g, png })
  }

  if (single) {
    setText(form, 'Text29', topAccountNo)
    setText(form, 'Text30', b1?.lastName)
    setText(form, 'Text31', b1?.firstName)
    setText(form, 'Text32', b2?.lastName)
    setText(form, 'Text33', b2?.firstName)
    const a = accts[0] ?? {}
    setText(form, 'Text35', a.financialInstitution)
    setText(form, 'Text36', a.branch)
    setText(form, 'Text37', a.accountName)
    setText(form, 'BSB No_5', a.bsb)
    setText(form, 'ACCOUNT No_5', a.accountNumber)
    setText(form, 'Comments', d.comments)
    setText(form, 'Enter Text30', b1?.mobile)
    setText(form, 'Enter Text29', b2?.mobile)
    setText(form, 'Enter Text32', isoDate(sg[startIdx]?.signedAt))
    setText(form, 'Enter Text34', isoDate(sg[startIdx + 1]?.signedAt))
    await addSig('Signature3', sg[startIdx]?.image)
    await addSig('Signature4', sg[startIdx + 1]?.image)
  } else {
    setText(form, 'Enter Text1', topAccountNo)
    setText(form, 'Enter Text2', b1?.lastName)
    setText(form, 'Enter Text3', b1?.firstName)
    setText(form, 'Enter Text4', b2?.lastName)
    setText(form, 'Enter Text5', b2?.firstName)
    const fi = ['Enter Text7', 'Enter Text11', 'Enter Text15', 'Enter Text19']
    const br = ['Enter Text8', 'Enter Text12', 'Enter Text16', 'Enter Text20']
    const nm = ['Enter Text9', 'Enter Text13', 'Enter Text17', 'Enter Text21']
    const bsb = ['BSB No', 'BSB No_2', 'BSB No_3', 'BSB No_4']
    const acc = ['ACCOUNT No', 'ACCOUNT No_2', 'ACCOUNT No_3', 'ACCOUNT No_4']
    accts.slice(0, 4).forEach((a, i) => {
      setText(form, fi[i]!, a.financialInstitution)
      setText(form, br[i]!, a.branch)
      setText(form, nm[i]!, a.accountName)
      setText(form, bsb[i]!, a.bsb)
      setText(form, acc[i]!, a.accountNumber)
    })
    setText(form, 'Enter Text23', b1?.mobile)
    setText(form, 'Enter Text26', b2?.mobile)
    setText(form, 'Enter Text25', isoDate(sg[startIdx]?.signedAt))
    setText(form, 'Enter Text28', isoDate(sg[startIdx + 1]?.signedAt))
    await addSig('Signature1', sg[startIdx]?.image)
    await addSig('Signature2', sg[startIdx + 1]?.image)
  }

  try {
    form.flatten()
  } catch {
    /* ignore */
  }
  for (const { g, png } of sigs) drawSigImage(g.page, png, g.r)
  if (single) pdf.removePage(1)
  else pdf.removePage(0)
}

// The Linked Account template has only two signature slots. For 3–4 borrowers,
// duplicate the page — same loan/account details — with borrowers 3 & 4 on it.
async function fillLinkedAccount(
  pdf: PDFDocument,
  form: PDFForm,
  rec: ServicingRequest,
  raw?: Uint8Array,
) {
  const b: any[] = (rec.details as any).borrowers ?? []
  await fillLinkedAccountPage(pdf, form, rec, 0)
  if (b.length > 2 && raw) {
    const pdf2 = await PDFDocument.load(raw, { ignoreEncryption: true })
    await fillLinkedAccountPage(pdf2, pdf2.getForm(), rec, 2)
    const [page2] = await pdf.copyPages(pdf2, [0])
    // Insert right after the first form page so both signature pages sit
    // together, ahead of the Client Service Agreement terms page.
    pdf.insertPage(1, page2)
  }
}

// ---------------------------------------------------------------------------
// Open Offset Account
// ---------------------------------------------------------------------------
async function fillOpenOffset(pdf: PDFDocument, form: PDFForm, rec: ServicingRequest) {
  const d = rec.details as any
  const b: any[] = d.borrowers ?? []
  const pages = pdf.getPages()
  setText(form, 'T1', b.map(fullName).filter(Boolean).join(', '))
  ;['T2', 'T3', 'T4', 'T5'].forEach((f, i) => setText(form, f, b[i]?.customerNumber))
  setText(form, 'T6', rec.loanAccountNumber)
  const nameF = ['T7', 'T8', 'T11', 'T12']
  const dateF = ['T9', 'T10', 'T13', 'T14']
  b.slice(0, 4).forEach((x, i) => {
    setText(form, nameF[i]!, fullName(x))
    setText(form, dateF[i]!, isoDate(d.signatures?.[i]?.signedAt))
  })
  // Signature panel geometry + each borrower's signature (captured before flatten).
  const g = fieldGeom(form, pages, 'S1')
  const sigPngs: any[] = []
  for (let i = 0; i < b.length && i < 4; i++) {
    sigPngs.push(await embedSig(pdf, d.signatures?.[i]?.image))
  }
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  try {
    form.flatten()
  } catch {
    /* ignore */
  }

  const page = g?.page ?? pages[0]!

  // Split the single signature panel into four equal columns so every borrower's
  // signature fits side-by-side within the same panel (was: only borrower 1).
  if (g) {
    const cellW = g.r.width / 4
    const maxH = g.r.height - 8
    for (let i = 0; i < sigPngs.length; i++) {
      const png = sigPngs[i]
      if (!png) continue
      const sc = Math.min((cellW - 12) / png.width, maxH / png.height)
      const w = png.width * sc
      const h = png.height * sc
      page.drawImage(png, {
        x: g.r.x + i * cellW + (cellW - w) / 2, // centred in its column
        y: g.r.y + (g.r.height - h) / 2,
        width: w,
        height: h,
      })
    }
  }

  // $250 variation fee + the borrower's selected payment method, drawn in the
  // large white space beneath the signature section.
  const feeComment: Record<string, string> = {
    redraw: 'Please debit the $250 variation fee from my Redraw.',
    'direct-debit': 'Please Direct Debit the $250 Variation fee from my nominated account.',
  }
  const comment = feeComment[d.feePayment] ?? ''
  const ink = rgb(0.12, 0.14, 0.18)
  page.drawText('$250.00 Offset Account Variation Fee', { x: 45, y: 340, size: 11, font: fontBold, color: ink })
  if (comment) {
    page.drawText(comment, { x: 45, y: 320, size: 10, font, color: ink })
  }
}

// ---------------------------------------------------------------------------
// Redraw Request
// ---------------------------------------------------------------------------
async function fillRedraw(pdf: PDFDocument, form: PDFForm, rec: ServicingRequest) {
  const d = rec.details as any
  const b: any[] = d.borrowers ?? []
  const dest = d.destination ?? {}
  const pages = pdf.getPages()
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  ;['Text1', 'Text2', 'Text3', 'Text4'].forEach((f, i) => setText(form, f, fullName(b[i])))
  setText(form, 'Loan Account Number', rec.loanAccountNumber)
  setText(form, 'Loan Account Name', dest.accountName)
  setText(form, 'BSB No', dest.bsb)
  setText(form, 'ACCOUNT No', dest.accountNumber)
  setText(form, 'Redraw Amount', money(d.amount))
  setText(form, 'Redraw Reason', d.reason)
  const dateF = ['Date1_af_date', 'Date2_af_date', 'Date3_af_date', 'Date4_af_date']
  b.slice(0, 4).forEach((_x, i) => setText(form, dateF[i]!, isoDate(d.signatures?.[i]?.signedAt)))

  // Note the source of the redraw funds at the top of the (roomy) reason box.
  // Shrink the reason field from the top so the note doesn't overlap the text.
  let noteY = 460
  try {
    const w = form.getTextField('Redraw Reason').acroField.getWidgets()[0]!
    const r = w.getRectangle()
    w.setRectangle({ x: r.x, y: r.y, width: r.width, height: r.height - 24 })
    noteY = r.y + r.height - 17 // just inside the freed strip
  } catch {
    /* fall back to the default y */
  }
  const sourceNote =
    d.redrawSource === 'offset'
      ? 'Fund to be redrawn from available balance in Offset Account.'
      : 'Fund to be redrawn from available balance in Loan Account.'
  pages[0]!.drawText(sourceNote, { x: 33, y: noteY, size: 9, font, color: rgb(0.1, 0.12, 0.16) })

  const purposeBox: Record<string, string> = {
    property: 'Check Box1',
    construction: 'Check Box2',
    'third-party': 'Check Box2',
    other: 'Check Box2',
    personal: 'Check Box3',
  }
  const overlays: Array<{ kind: 'x' | 'img'; g: NonNullable<Geom>; png?: any }> = []
  const boxName = purposeBox[d.purpose]
  if (boxName) {
    const g = fieldGeom(form, pages, boxName)
    if (g) overlays.push({ kind: 'x', g })
  }
  const sigNames = ['Signature1', 'Signature2', 'Signature3', 'Signature4']
  for (let i = 0; i < b.length && i < 4; i++) {
    const png = await embedSig(pdf, d.signatures?.[i]?.image)
    const g = fieldGeom(form, pages, sigNames[i]!)
    if (png && g) overlays.push({ kind: 'img', g, png })
  }
  try {
    form.flatten()
  } catch {
    /* ignore */
  }
  for (const o of overlays) {
    if (o.kind === 'x') drawXMark(o.g.page, o.g.r, font)
    else drawSigImage(o.g.page, o.png, o.g.r)
  }
}

// ---------------------------------------------------------------------------
// Product Switch  (also used by Permanent Principal Reduction — same template)
// ---------------------------------------------------------------------------
// Fill ONE Product Switch page for the borrower pair starting at `startIdx`
// (borrowers startIdx and startIdx+1). Shared loan/product/reason data is
// repeated on every page; only the borrower names, signatures and dates differ.
async function fillProductSwitchPage(
  pdf: PDFDocument,
  form: PDFForm,
  rec: ServicingRequest,
  startIdx: number,
) {
  const d = rec.details as any
  const b: any[] = d.borrowers ?? []
  const sg: any[] = d.signatures ?? []
  const b1 = b[startIdx]
  const b2 = b[startIdx + 1]
  const pages = pdf.getPages()
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  const overlays: Array<{ kind: 'x' | 'img'; g: NonNullable<Geom>; png?: any }> = []
  const markX = (name: string) => {
    const g = fieldGeom(form, pages, name)
    if (g) overlays.push({ kind: 'x', g })
  }

  setText(form, 'Enter Text1', fullName(b1))
  setText(form, 'Enter Text2', fullName(b2))
  setText(form, 'Enter Text3', rec.loanAccountNumber) // Loan Account Number 1 (same on every page)

  if (rec.type === 'product-switch') {
    if (d.productType === 'pi') markX('Check Box1')
    else if (d.productType === 'io') {
      markX('Check Box2')
      setText(form, 'Enter Text4', d.term)
    } else if (d.productType === 'fixed') {
      markX('Check Box3')
      if (d.interestRate != null) setText(form, 'Enter Text5', `${d.interestRate}%`)
      setText(form, 'Enter Text6', d.term)
    }
    setText(form, 'Enter Text25', d.reason)
  } else {
    // Permanent Principal Reduction shares this template — no product fields.
    const amt = money(d.amount)
    setText(
      form,
      'Enter Text25',
      `Permanent principal reduction${amt ? ` of ${amt}` : ''}.${d.reason ? ` ${d.reason}` : ''}`,
    )
  }

  // Signature section — the two borrowers for this page
  setText(form, 'Enter Text15', fullName(b1))
  setText(form, 'Enter Text20', fullName(b2))
  const dmy = (iso?: string): [string, string, string] => {
    if (!iso) return ['', '', '']
    const [y, m, day] = iso.slice(0, 10).split('-')
    return [day ?? '', m ?? '', y ?? '']
  }
  const [da1, mo1, yr1] = dmy(sg[startIdx]?.signedAt)
  setText(form, 'Enter Text17', da1)
  setText(form, 'Enter Text18', mo1)
  setText(form, 'Enter Text19', yr1)
  const [da2, mo2, yr2] = dmy(sg[startIdx + 1]?.signedAt)
  setText(form, 'Enter Text22', da2)
  setText(form, 'Enter Text23', mo2)
  setText(form, 'Enter Text24', yr2)

  const sigNames = ['Signature1_es_:signer:signature', 'Signature2_es_:signer:signature']
  for (const [i, name] of sigNames.entries()) {
    const png = await embedSig(pdf, sg[startIdx + i]?.image)
    const g = fieldGeom(form, pages, name)
    if (png && g) overlays.push({ kind: 'img', g, png })
  }
  try {
    form.flatten()
  } catch {
    /* ignore */
  }
  for (const o of overlays) {
    if (o.kind === 'x') drawXMark(o.g.page, o.g.r, font)
    else drawSigImage(o.g.page, o.png, o.g.r)
  }
}

// The Product Switch template (shared with Principal Reduction) only has two
// signature slots. For 3–4 borrowers, duplicate the page — same loan/product/
// reason details — and put borrowers 3 & 4 on the second copy.
async function fillProductSwitch(
  pdf: PDFDocument,
  form: PDFForm,
  rec: ServicingRequest,
  raw?: Uint8Array,
) {
  const b: any[] = (rec.details as any).borrowers ?? []
  await fillProductSwitchPage(pdf, form, rec, 0)
  if (b.length > 2 && raw) {
    const pdf2 = await PDFDocument.load(raw, { ignoreEncryption: true })
    await fillProductSwitchPage(pdf2, pdf2.getForm(), rec, 2)
    const [page2] = await pdf.copyPages(pdf2, [0])
    pdf.addPage(page2)
  }
}

// ---------------------------------------------------------------------------
// Repayment Change (flat PDF — no form fields, so text is overlaid by position)
// ---------------------------------------------------------------------------
async function fillRepaymentChange(pdf: PDFDocument, _form: PDFForm, rec: ServicingRequest) {
  const d = rec.details as any
  const b: any[] = d.borrowers ?? []
  const page = pdf.getPage(0)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.1, 0.12, 0.16)
  const T = (s: unknown, x: number, y: number, size = 10, f = font) => {
    if (s == null || s === '') return
    page.drawText(String(s), { x, y, size, font: f, color: ink })
  }

  // Borrower names (top section)
  const nameY = [724, 697, 669, 642]
  b.slice(0, 4).forEach((x, i) => T(fullName(x), 125, nameY[i]!))

  // "I/We request that [WLTH] adjust the repayments to the following:"
  T('WLTH', 188, 616)

  // Row 1 — loan account, new amount, frequency
  T(rec.loanAccountNumber, 70, 569)
  T(d.amountType === 'fixed' ? money(d.amount) : 'Minimum', 300, 569)
  // Frequency: draw an X centred on the checkbox to the right of each option.
  const freqBoxCx: Record<string, number> = { weekly: 424, fortnightly: 487, monthly: 538 }
  const cx = freqBoxCx[d.frequency]
  if (cx != null) {
    const size = 11
    const xw = bold.widthOfTextAtSize('X', size)
    page.drawText('X', { x: cx - xw / 2, y: 566, size, font: bold, color: ink })
  }

  // Signatures section (one row per borrower)
  const sigY = [403, 375, 348, 320]
  for (let i = 0; i < b.length && i < 4; i++) {
    T(fullName(b[i]), 125, sigY[i]!)
    const iso = d.signatures?.[i]?.signedAt
    if (iso) {
      const [yr, mo, day] = iso.slice(0, 10).split('-')
      T(day, 478, sigY[i]!, 9)
      T(mo, 520, sigY[i]!, 9)
      T(yr, 548, sigY[i]!, 9)
    }
    const png = await embedSig(pdf, d.signatures?.[i]?.image)
    if (png) {
      const sc = Math.min(110 / png.width, 16 / png.height)
      page.drawImage(png, { x: 285, y: sigY[i]! - 4, width: png.width * sc, height: png.height * sc })
    }
  }
}

// Registry of per-type fillers. Forms without an entry get a summary PDF.
const FILLERS: Partial<
  Record<
    RequestType,
    (pdf: PDFDocument, form: PDFForm, rec: ServicingRequest, raw?: Uint8Array) => Promise<void> | void
  >
> = {
  'direct-debit': fillDirectDebit,
  'linked-account': fillLinkedAccount,
  'open-offset': fillOpenOffset,
  'redraw': fillRedraw,
  'product-switch': fillProductSwitch,
  'principal-reduction': fillProductSwitch,
  'repayment-change': fillRepaymentChange,
}

export function hasPdfTemplate(type: RequestType) {
  return type in FILLERS
}

/** Embed an image buffer as PNG or JPG (tries both, by hint then fallback). */
async function embedImageAny(pdf: PDFDocument, buf: Buffer, hint: string) {
  const order = hint.toLowerCase().includes('png') ? (['png', 'jpg'] as const) : (['jpg', 'png'] as const)
  for (const kind of order) {
    try {
      return kind === 'png' ? await pdf.embedPng(buf) : await pdf.embedJpg(buf)
    } catch {
      /* try the other decoder */
    }
  }
  return null
}

/**
 * Appends the request's uploaded documents to the end of the PDF so everything
 * is one combined file. PDFs are merged page-for-page; images (photos) become a
 * full A4 page each. Unsupported/unreadable files get a small placeholder page
 * so nothing is silently dropped.
 */
async function appendAttachments(pdf: PDFDocument, rec: ServicingRequest) {
  const atts = (rec.details as { attachments?: Array<{ name?: string; type?: string; path?: string }> })
    ?.attachments
  if (!atts?.length) return

  for (const att of atts) {
    if (!att?.path) continue
    const buf = await downloadAttachment(att.path)
    if (!buf) continue
    const type = (att.type || '').toLowerCase()
    const isPdf = type.includes('pdf') || att.path.toLowerCase().endsWith('.pdf')

    if (isPdf) {
      try {
        const src = await PDFDocument.load(buf, { ignoreEncryption: true })
        const copied = await pdf.copyPages(src, src.getPageIndices())
        copied.forEach((p) => pdf.addPage(p))
        continue
      } catch {
        /* fall through to placeholder */
      }
    } else {
      const img = await embedImageAny(pdf, buf, `${type} ${att.path}`)
      if (img) {
        // Photo -> full A4 page, fitted with a margin, centred.
        const page = pdf.addPage([595, 842])
        const margin = 36
        const sc = Math.min((595 - margin * 2) / img.width, (842 - margin * 2) / img.height)
        const w = img.width * sc
        const h = img.height * sc
        page.drawImage(img, { x: (595 - w) / 2, y: (842 - h) / 2, width: w, height: h })
        continue
      }
    }

    // Unreadable or unsupported (e.g. HEIC/WebP) — leave a marker, don't drop it.
    const page = pdf.addPage([595, 842])
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    page.drawText(ascii(`Attachment: ${att.name || 'file'}`), { x: 40, y: 790, size: 12, font })
    page.drawText(`(This file type could not be embedded: ${att.type || 'unknown'})`, {
      x: 40,
      y: 772,
      size: 10,
      font,
      color: rgb(0.45, 0.5, 0.55),
    })
  }
}

export async function fillTemplate(
  rec: ServicingRequest,
): Promise<{ bytes: Uint8Array; filename: string }> {
  const filler = FILLERS[rec.type]
  // Forms without an official-template map get a clean WLTH summary PDF instead.
  if (!filler) {
    const summary = await generateSummaryPdf(rec)
    const pdf = await PDFDocument.load(summary)
    await appendAttachments(pdf, rec)
    return { bytes: await pdf.save(), filename: `${rec.reference}.pdf` }
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
  await filler(pdf, form, rec, raw)
  try {
    form.flatten()
  } catch {
    /* some templates have signature fields that resist flatten; ignore */
  }
  // Combine any uploaded documents (bank statements, photos) into this one PDF.
  await appendAttachments(pdf, rec)
  const bytes = await pdf.save()
  return { bytes, filename: `${rec.reference}.pdf` }
}
