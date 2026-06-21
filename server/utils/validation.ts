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
  financialInstitution: z.string().min(1, 'Financial institution is required'),
  branch: z.string().min(1, 'Branch is required'),
  accountName: z.string().min(1, 'Account name is required'),
  bsb,
  accountNumber,
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
    linkedAccounts: z.array(linkedAccountSchema).min(1).max(4),
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

const linkedAccount = baseSchema.extend({
  action: z.enum(['link', 'update']),
  bankAccount: bankAccountSchema,
})

const repaymentChange = baseSchema
  .extend({
    newAmount: money.optional(),
    newFrequency: frequency.optional(),
    effectiveDate: z.coerce.date(),
  })
  .refine((d) => d.newAmount !== undefined || d.newFrequency !== undefined, {
    message: 'Provide a new amount and/or a new frequency',
    path: ['newAmount'],
  })

const redraw = baseSchema.extend({
  amount: money,
  disbursementAccount: bankAccountSchema,
  reason: z.string().max(500).optional(),
})

const openOffset = baseSchema.extend({
  accountName: z.string().min(1, 'Account name is required'),
  initialDeposit: money.optional(),
})

const principalReduction = baseSchema.extend({
  amount: money,
  sourceAccount: bankAccountSchema,
  // true = keep repayments, shorten term; false = lower repayments, keep term
  reduceTerm: z.boolean().default(false),
})

const productSwitch = baseSchema.extend({
  currentProduct: z.string().min(1, 'Current product is required'),
  targetProduct: z.string().min(1, 'Target product is required'),
  reason: z.string().max(500).optional(),
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
