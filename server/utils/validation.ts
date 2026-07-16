import { z } from 'zod'
import type { RequestType } from '~~/server/types/requests'

/**
 * Zod schemas for each Client Hub request type.
 *
 * `bodySchemas` is keyed by RequestType; the dynamic API route looks up the
 * matching schema and validates the incoming payload before it is stored.
 */

const bsb = z
  .string()
  .regex(/^\d{3}-?\d{3}$/, 'BSB must be 6 digits (e.g. 062-000)')
  .transform((v) => v.replace('-', ''))

const accountNumber = z
  .string()
  .regex(/^\d{5,10}$/, 'Account number must be 5–10 digits')

const money = z.number().positive('Amount must be greater than 0').finite()

const loanAccountNumber = z
  .string()
  .min(4, 'Loan account number is required')
  .max(20)

export const customerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('A valid email is required'),
  phone: z.string().min(6, 'A valid phone number is required'),
})

export const bankAccountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  bsb,
  accountNumber,
})

const frequency = z.enum(['weekly', 'fortnightly', 'monthly'])

/** Fields shared by every servicing request. */
const baseSchema = z.object({
  customer: customerSchema,
  loanAccountNumber,
})

// ---- Direct Debit Request (multi-step form) ----
const borrowerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  mobile: z.string().min(6, 'A valid mobile number is required'),
  email: z.string().email('A valid email is required'),
})

const linkedAccountSchema = z.object({
  accountType: z.enum(['external', 'wlth']).default('external'),
  financialInstitution: z.string().min(1, 'Financial institution is required'),
  branch: z.string().optional(),
  accountName: z.string().min(1, 'Account name is required'),
  bsb,
  accountNumber,
})

// Linked Account Nomination: which WLTH account repayments link to (and, for
// offset, its number). The nominated external account details — institution,
// account name, BSB and account number — are required for both loan and offset
// links; branch stays optional.
const nominatedAccountSchema = z.object({
  linkTo: z.enum(['loan', 'offset']).optional(),
  offsetAccountNumber: z.string().optional(),
  financialInstitution: z.string().min(1, 'Financial institution is required'),
  branch: z.string().optional(),
  accountName: z.string().min(1, 'Account name is required'),
  bsb,
  accountNumber,
})

const attachmentSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  size: z.number().int().nonnegative().max(25 * 1024 * 1024, 'File exceeds 25MB'),
  // Supabase Storage path (uploaded directly from the browser).
  path: z.string().min(1, 'Missing upload reference'),
})

const signatureSchema = z.object({
  borrowerIndex: z.number().int().min(0),
  // PNG data URL produced by the signature canvas
  image: z.string().regex(/^data:image\/png;base64,/, 'A signature is required'),
  signedAt: z.string(),
})

const directDebit = baseSchema
  .extend({
    borrowers: z.array(borrowerSchema).min(1).max(4),
    comments: z.string().max(1000).optional(),
    // Where repayments are drawn from: an external bank account, or a WLTH offset account.
    debitSource: z.enum(['external', 'offset']),
    offsetAccountNumber: z.string().optional(),
    linkedAccounts: z.array(linkedAccountSchema).max(4).default([]),
    attachments: z.array(attachmentSchema).max(10).default([]),
    repayment: z
      .object({
        frequency,
        amountType: z.enum(['minimum', 'other']),
        amount: money.optional(),
      })
      .refine((r) => r.amountType !== 'other' || r.amount !== undefined, {
        message: 'Enter the repayment amount',
        path: ['amount'],
      }),
    declaration: z.object({
      agreed: z.literal(true, {
        errorMap: () => ({ message: 'You must accept the agreement' }),
      }),
    }),
    signatures: z.array(signatureSchema).min(1).max(4),
    audit: z
      .object({
        userAgent: z.string().optional(),
        platform: z.string().optional(),
        timezone: z.string().optional(),
        capturedAt: z.string().optional(),
      })
      .optional(),
  })
  // Every borrower must have signed.
  .refine((d) => d.signatures.length === d.borrowers.length, {
    message: 'Every borrower must sign',
    path: ['signatures'],
  })
  // Offset: a valid offset account number is required.
  .refine(
    (d) => d.debitSource !== 'offset' || /^\d{5,10}$/.test((d.offsetAccountNumber ?? '').replace(/\D/g, '')),
    { message: 'A valid offset account number is required', path: ['offsetAccountNumber'] },
  )
  // External: at least one linked account, with a bank statement for each.
  .refine((d) => d.debitSource !== 'external' || d.linkedAccounts.length >= 1, {
    message: 'At least one linked account is required',
    path: ['linkedAccounts'],
  })
  .refine((d) => d.debitSource !== 'external' || d.attachments.length >= d.linkedAccounts.length, {
    message: 'A bank statement is required for each linked account',
    path: ['attachments'],
  })

// ---- Linked Account Nomination (multi-step form) ----
const linkedAccount = baseSchema
  .extend({
    borrowers: z.array(borrowerSchema).min(1).max(4),
    comments: z.string().max(1000).optional(),
    smsfTrustName: z.string().max(200).optional(),
    linkedAccounts: z.array(nominatedAccountSchema).min(1).max(4),
    attachments: z.array(attachmentSchema).max(10).default([]),
    declaration: z.object({
      agreed: z.literal(true, {
        errorMap: () => ({ message: 'You must accept the terms and conditions' }),
      }),
    }),
    signatures: z.array(signatureSchema).min(1).max(4),
    audit: z
      .object({
        userAgent: z.string().optional(),
        platform: z.string().optional(),
        timezone: z.string().optional(),
        capturedAt: z.string().optional(),
      })
      .optional(),
  })
  .refine((d) => d.signatures.length === d.borrowers.length, {
    message: 'Every borrower must sign',
    path: ['signatures'],
  })
  // A bank statement is required for each linked account (loan or offset).
  .refine((d) => d.attachments.length >= d.linkedAccounts.length, {
    message: 'A bank statement is required for each linked account',
    path: ['attachments'],
  })
  // Offset selections need a valid offset account number.
  .refine(
    (d) =>
      d.linkedAccounts.every(
        (a) => a.linkTo !== 'offset' || /^\d{5,10}$/.test((a.offsetAccountNumber ?? '').replace(/\D/g, '')),
      ),
    { message: 'A valid offset account number is required for each offset account', path: ['linkedAccounts'] },
  )

// ---- Repayment Change Request (multi-step form) ----
const repaymentChange = baseSchema
  .extend({
    borrowers: z.array(borrowerSchema).min(1).max(4),
    frequency,
    amountType: z.enum(['minimum', 'fixed']),
    amount: money.optional(),
    declaration: z.object({
      agreed: z.literal(true, {
        errorMap: () => ({ message: 'You must accept the declaration' }),
      }),
    }),
    signatures: z.array(signatureSchema).min(1).max(4),
    audit: z
      .object({
        userAgent: z.string().optional(),
        platform: z.string().optional(),
        timezone: z.string().optional(),
        capturedAt: z.string().optional(),
      })
      .optional(),
  })
  .refine((d) => d.amountType !== 'fixed' || d.amount !== undefined, {
    message: 'Enter the fixed repayment amount',
    path: ['amount'],
  })
  .refine((d) => d.signatures.length === d.borrowers.length, {
    message: 'Every borrower must sign',
    path: ['signatures'],
  })

// ---- Redraw Request (multi-step form) ----
const redraw = baseSchema
  .extend({
    borrowers: z.array(borrowerSchema).min(1).max(4),
    smsfTrustName: z.string().max(200).optional(),
    amount: money,
    // Which WLTH account the available redraw is drawn from.
    redrawSource: z.enum(['loan', 'offset']).default('loan'),
    destination: bankAccountSchema,
    purpose: z.enum(['property', 'construction', 'third-party', 'personal', 'other']),
    reason: z
      .string()
      .min(40, 'Please provide us more information about your request')
      .max(1000),
    attachments: z.array(attachmentSchema).max(20).default([]),
    declaration: z.object({
      agreed: z.literal(true, {
        errorMap: () => ({ message: 'You must accept the declaration' }),
      }),
    }),
    signatures: z.array(signatureSchema).min(1).max(4),
    audit: z
      .object({
        userAgent: z.string().optional(),
        platform: z.string().optional(),
        timezone: z.string().optional(),
        capturedAt: z.string().optional(),
      })
      .optional(),
  })
  .refine((d) => d.signatures.length === d.borrowers.length, {
    message: 'Every borrower must sign',
    path: ['signatures'],
  })
  // Supporting evidence required over $100k or for proof-of-use purposes.
  .refine(
    (d) =>
      !(d.amount > 100000 || ['property', 'construction', 'personal'].includes(d.purpose)) ||
      d.attachments.length >= 1,
    {
      message: 'Supporting documentation is required for this redraw',
      path: ['attachments'],
    },
  )

// ---- Open Offset Account (multi-step form) ----
const offsetBorrowerSchema = borrowerSchema.extend({
  customerNumber: z.string().min(1, 'Customer number is required'),
})

const openOffset = baseSchema
  .extend({
    borrowers: z.array(offsetBorrowerSchema).min(1).max(4),
    // How the $250 Offset Account Variation Fee will be paid.
    feePayment: z.enum(['redraw', 'direct-debit'], {
      errorMap: () => ({ message: 'Select how the $250 variation fee will be paid' }),
    }),
    declaration: z.object({
      agreed: z.literal(true, {
        errorMap: () => ({ message: 'You must confirm the declaration' }),
      }),
    }),
    signatures: z.array(signatureSchema).min(1).max(4),
    audit: z
      .object({
        userAgent: z.string().optional(),
        platform: z.string().optional(),
        timezone: z.string().optional(),
        capturedAt: z.string().optional(),
      })
      .optional(),
  })
  .refine((d) => d.signatures.length === d.borrowers.length, {
    message: 'Every borrower must sign',
    path: ['signatures'],
  })

// ---- Permanent Principal Reduction (multi-step form) ----
const principalReduction = baseSchema
  .extend({
    borrowers: z.array(borrowerSchema).min(1).max(4),
    amount: money,
    reason: z.string().min(1, 'A reason is required').max(1000),
    acknowledgement: z.object({
      accepted: z.literal(true, {
        errorMap: () => ({ message: 'You must accept the acknowledgement' }),
      }),
    }),
    declaration: z.object({
      agreed: z.literal(true, {
        errorMap: () => ({ message: 'You must accept the declaration' }),
      }),
    }),
    signatures: z.array(signatureSchema).min(1).max(4),
    audit: z
      .object({
        userAgent: z.string().optional(),
        platform: z.string().optional(),
        timezone: z.string().optional(),
        capturedAt: z.string().optional(),
      })
      .optional(),
  })
  .refine((d) => d.signatures.length === d.borrowers.length, {
    message: 'Every borrower must sign',
    path: ['signatures'],
  })

// ---- Product Switch Request (multi-step form) ----
const productSwitch = baseSchema
  .extend({
    borrowers: z.array(borrowerSchema).min(1).max(4),
    productType: z.enum(['pi', 'io', 'fixed']),
    term: z.string().optional(),
    reason: z
      .string()
      .min(50, 'Please provide us more information about your request')
      .max(1000),
    declaration: z.object({
      agreed: z.literal(true, {
        errorMap: () => ({ message: 'You must accept the declaration' }),
      }),
    }),
    signatures: z.array(signatureSchema).min(1).max(4),
    audit: z
      .object({
        userAgent: z.string().optional(),
        platform: z.string().optional(),
        timezone: z.string().optional(),
        capturedAt: z.string().optional(),
      })
      .optional(),
  })
  .refine((d) => d.signatures.length === d.borrowers.length, {
    message: 'Every borrower must sign',
    path: ['signatures'],
  })
  // Interest Only and Fixed Rate require a term.
  .refine((d) => !['io', 'fixed'].includes(d.productType) || !!d.term, {
    message: 'A term is required for this product',
    path: ['term'],
  })

export const bodySchemas = {
  'direct-debit': directDebit,
  'linked-account': linkedAccount,
  'repayment-change': repaymentChange,
  'redraw': redraw,
  'open-offset': openOffset,
  'principal-reduction': principalReduction,
  'product-switch': productSwitch,
} satisfies Record<RequestType, z.ZodTypeAny>

export const statusUpdateSchema = z.object({
  status: z.enum([
    'submitted',
    'in_review',
    'approved',
    'rejected',
    'completed',
    'cancelled',
  ]),
})
