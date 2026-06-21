import { randomUUID } from 'node:crypto'
import type {
  RequestStatus,
  RequestType,
  ServicingRequest,
} from '~~/server/types/requests'

/**
 * Tiny in-memory repository for servicing requests.
 *
 * Survives across requests within a single dev/server process. Swap the Map
 * for a real datastore (Postgres, DynamoDB, etc.) without touching callers.
 */
const db = new Map<string, ServicingRequest>()

/** Human-friendly reference, e.g. WLTH-DD-3F9A2B. */
function buildReference(type: RequestType): string {
  const prefix: Record<RequestType, string> = {
    'direct-debit': 'DD',
    'linked-account': 'LA',
    'repayment-change': 'RC',
    'redraw': 'RD',
    'open-offset': 'OF',
    'principal-reduction': 'PR',
    'product-switch': 'PS',
  }
  // Some forms use a YEAR-sequence scheme (e.g. LAN-2025-000123).
  const yearScheme: Partial<Record<RequestType, string>> = {
    'linked-account': 'LAN',
    'repayment-change': 'RCR',
    'redraw': 'RRR',
    'open-offset': 'OAR',
    'product-switch': 'PSR',
  }
  if (yearScheme[type]) {
    const year = new Date().getFullYear()
    const seq = (parseInt(randomUUID().replace(/\D/g, '').slice(0, 6) || '0', 10) % 1_000_000)
      .toString()
      .padStart(6, '0')
    return `${yearScheme[type]}-${year}-${seq}`
  }
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
  return `WLTH-${prefix[type]}-${suffix}`
}

export function createRequest(
  type: RequestType,
  payload: { customer: ServicingRequest['customer']; loanAccountNumber: string } & {
    [key: string]: unknown
  },
): ServicingRequest {
  const { customer, loanAccountNumber, ...details } = payload
  const now = new Date().toISOString()
  const record: ServicingRequest = {
    id: randomUUID(),
    type,
    reference: buildReference(type),
    status: 'submitted',
    customer,
    loanAccountNumber,
    details,
    createdAt: now,
    updatedAt: now,
  }
  db.set(record.id, record)
  return record
}

export function listRequests(type?: RequestType): ServicingRequest[] {
  const all = [...db.values()]
  const filtered = type ? all.filter((r) => r.type === type) : all
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getRequest(id: string): ServicingRequest | undefined {
  return db.get(id)
}

export function updateStatus(
  id: string,
  status: RequestStatus,
): ServicingRequest | undefined {
  const record = db.get(id)
  if (!record) return undefined
  record.status = status
  record.updatedAt = new Date().toISOString()
  db.set(id, record)
  return record
}
