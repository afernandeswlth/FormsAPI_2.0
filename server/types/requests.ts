/**
 * Domain types for the WLTH Client Hub loan-servicing API.
 *
 * Each "request type" maps to one of the seven options on the Client Hub
 * landing screen. A submitted request shares a common envelope (id, type,
 * customer, status, timestamps) and carries a type-specific `details` payload.
 */

export const REQUEST_TYPES = [
  'direct-debit',
  'linked-account',
  'repayment-change',
  'redraw',
  'open-offset',
  'principal-reduction',
  'product-switch',
] as const

export type RequestType = (typeof REQUEST_TYPES)[number]

/** Lifecycle states a servicing request moves through. */
export const REQUEST_STATUSES = [
  'submitted',
  'in_review',
  'approved',
  'rejected',
  'completed',
  'cancelled',
] as const

export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export interface Customer {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface BankAccount {
  accountName: string
  /** Australian Bank-State-Branch code, 6 digits. */
  bsb: string
  accountNumber: string
}

/** Stored representation of any servicing request. */
export interface ServicingRequest<TDetails = Record<string, unknown>> {
  id: string
  type: RequestType
  reference: string
  status: RequestStatus
  customer: Customer
  loanAccountNumber: string
  details: TDetails
  createdAt: string
  updatedAt: string
}

/** Metadata describing each Client Hub option (mirrors the landing screen). */
export interface HubOption {
  type: RequestType
  title: string
  description: string
  endpoint: string
}

export const HUB_OPTIONS: HubOption[] = [
  {
    type: 'direct-debit',
    title: 'Direct Debit Request',
    description: 'Set up or amend a direct debit for your loan repayments.',
    endpoint: '/api/requests/direct-debit',
  },
  {
    type: 'linked-account',
    title: 'Linked Account Nomination',
    description: "Link or update the account you'd like repayments to be drawn from.",
    endpoint: '/api/requests/linked-account',
  },
  {
    type: 'repayment-change',
    title: 'Repayment Change',
    description: 'Request a change to your repayment amount or frequency.',
    endpoint: '/api/requests/repayment-change',
  },
  {
    type: 'redraw',
    title: 'Redraw Request',
    description: 'Request to redraw available funds from your loan.',
    endpoint: '/api/requests/redraw',
  },
  {
    type: 'open-offset',
    title: 'Open Offset',
    description: 'Open an offset account to link to your loan.',
    endpoint: '/api/requests/open-offset',
  },
  {
    type: 'principal-reduction',
    title: 'Permanent Principal Reduction',
    description: 'Request to make a permanent reduction to your loan principal.',
    endpoint: '/api/requests/principal-reduction',
  },
  {
    type: 'product-switch',
    title: 'Product Switch',
    description: 'Request to switch your loan to a different product.',
    endpoint: '/api/requests/product-switch',
  },
]
